"use strict";
/**
 * Overspending Prediction Engine
 *
 * Predicts whether user will exceed monthly limit BEFORE month end.
 *
 * Approach:
 * - Rule-based forecasting using spend velocity
 * - Features: current spend, days elapsed, historical patterns
 * - Can be upgraded to ML regression later without API changes
 *
 * Key Assumptions:
 * 1. Spending patterns are relatively consistent month-to-month
 * 2. Recent behavior (last 7 days) is weighted more heavily
 * 3. Weekend vs weekday patterns are considered
 * 4. Linear projection is baseline, adjusted by historical variance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictOverspendingMultiple = exports.predictOverspending = void 0;
const mongoose_1 = require("mongoose");
const finance_model_1 = require("../finance.model");
const creditCard_model_1 = require("../creditCard.model");
const spendingProfile_service_1 = require("./spendingProfile.service");
const monthlySpending_service_1 = require("../sms/monthlySpending.service");
const logger_1 = require("../../../../utils/logger");
/**
 * Get number of days in current month
 */
const getDaysInMonth = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
};
/**
 * Count weekend days remaining in month
 */
const getWeekendDaysRemaining = (date = new Date()) => {
    const today = date.getDate();
    const daysInMonth = getDaysInMonth(date);
    let weekendCount = 0;
    for (let day = today + 1; day <= daysInMonth; day++) {
        const testDate = new Date(date.getFullYear(), date.getMonth(), day);
        const dayOfWeek = testDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
            weekendCount++;
        }
    }
    return weekendCount;
};
/**
 * Generate overspending prediction for a credit card
 *
 * @param userId User ID
 * @param creditCardId Credit card ID
 * @param referenceDate Date to use for prediction (defaults to now)
 * @returns Prediction with probability, expected spend, and explanation
 */
const predictOverspending = async (userId, creditCardId, referenceDate = new Date()) => {
    logger_1.logger.info(`Predicting overspending for card ${creditCardId}`);
    // Get card details
    const card = await creditCard_model_1.CreditCard.findOne({
        _id: new mongoose_1.Types.ObjectId(creditCardId),
        userId: new mongoose_1.Types.ObjectId(userId),
        isActive: true
    });
    if (!card || !card.monthlyLimit || card.monthlyLimit <= 0) {
        logger_1.logger.warn(`Card not found or no monthly limit set: ${creditCardId}`);
        return null;
    }
    const month = (0, monthlySpending_service_1.getCurrentMonth)(referenceDate);
    const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    // Get current month's transactions
    const currentMonthTransactions = await finance_model_1.Transaction.find({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        type: "expense",
        paymentType: "credit",
        date: { $gte: monthStart, $lte: referenceDate }
    });
    const currentSpend = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    // If already breached, return high probability
    if (currentSpend >= card.monthlyLimit) {
        return {
            creditCardId,
            userId,
            month,
            probabilityOfBreach: 1.0,
            expectedMonthEndSpend: currentSpend,
            monthlyLimit: card.monthlyLimit,
            currentSpend,
            riskLevel: "critical",
            daysElapsed: referenceDate.getDate(),
            daysRemaining: getDaysInMonth(referenceDate) - referenceDate.getDate(),
            currentDailyAverage: currentSpend / referenceDate.getDate(),
            projectedDailyAverage: currentSpend / referenceDate.getDate(),
            confidenceScore: 1.0,
            explanation: `You have already spent ₹${currentSpend.toLocaleString()}, which exceeds your monthly limit of ₹${card.monthlyLimit.toLocaleString()}.`,
            factors: [
                {
                    factor: "Current spend",
                    impact: "negative",
                    description: `Already at ${((currentSpend / card.monthlyLimit) * 100).toFixed(1)}% of limit`
                }
            ],
            generatedAt: new Date()
        };
    }
    // === FEATURE ENGINEERING ===
    const daysElapsed = referenceDate.getDate();
    const daysInMonth = getDaysInMonth(referenceDate);
    const daysRemaining = daysInMonth - daysElapsed;
    const monthProgress = daysElapsed / daysInMonth; // 0-1
    // Current spend velocity
    const currentDailyAverage = daysElapsed > 0 ? currentSpend / daysElapsed : 0;
    // Get historical profile (6 months)
    const profile = await (0, spendingProfile_service_1.generateSpendingProfile)(userId, creditCardId, 6);
    // === PREDICTION LOGIC ===
    let expectedMonthEndSpend;
    let confidenceScore;
    const factors = [];
    if (profile.dataPoints < 10) {
        // Insufficient data: Use simple linear projection
        expectedMonthEndSpend = (currentSpend / daysElapsed) * daysInMonth;
        confidenceScore = 0.4; // Low confidence
        factors.push({
            factor: "Limited historical data",
            impact: "negative",
            description: `Only ${profile.dataPoints} transactions available for analysis`
        });
    }
    else {
        // Sufficient data: Use weighted prediction
        // Method 1: Linear projection from current pace
        const linearProjection = (currentSpend / daysElapsed) * daysInMonth;
        // Method 2: Historical average adjusted for progress
        const historicalProjection = profile.averageMonthlySpend;
        // Method 3: Recent trend (last 7 days)
        const last7DaysTransactions = currentMonthTransactions.filter(t => {
            const daysDiff = Math.ceil((referenceDate.getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24));
            return daysDiff <= 7;
        });
        const last7DaysSpend = last7DaysTransactions.reduce((sum, t) => sum + t.amount, 0);
        const recentDailyAverage = last7DaysSpend / Math.min(7, daysElapsed);
        const recentTrendProjection = recentDailyAverage * daysInMonth;
        // Weighted combination (recent trend gets higher weight as month progresses)
        const recentWeight = Math.min(0.6, monthProgress); // Max 60% weight to recent trend
        const historicalWeight = 0.3;
        const linearWeight = 1 - recentWeight - historicalWeight;
        expectedMonthEndSpend =
            (linearProjection * linearWeight) +
                (historicalProjection * historicalWeight) +
                (recentTrendProjection * recentWeight);
        // Confidence increases with more data and consistency
        const baseConfidence = Math.min(0.9, profile.dataPoints / 100);
        const volatilityPenalty = Math.min(0.3, profile.coefficientOfVariation * 0.5);
        confidenceScore = Math.max(0.5, baseConfidence - volatilityPenalty);
        // Add factors
        if (recentDailyAverage > currentDailyAverage * 1.2) {
            factors.push({
                factor: "Accelerating spend",
                impact: "negative",
                description: `Last 7 days average (₹${Math.round(recentDailyAverage)}/day) is 20% higher than month average`
            });
        }
        if (currentSpend > profile.averageMonthlySpend * monthProgress * 1.15) {
            factors.push({
                factor: "Above typical pace",
                impact: "negative",
                description: `Spending ${((currentSpend / (profile.averageMonthlySpend * monthProgress) - 1) * 100).toFixed(1)}% faster than usual`
            });
        }
        // Weekend adjustment
        const weekendDaysRemaining = getWeekendDaysRemaining(referenceDate);
        if (weekendDaysRemaining > 0 && profile.peakSpendingDayOfWeek === 0 || profile.peakSpendingDayOfWeek === 6) {
            expectedMonthEndSpend *= 1.05; // 5% bump for weekend spending pattern
            factors.push({
                factor: "Weekend spending pattern",
                impact: "negative",
                description: `${weekendDaysRemaining} weekend days remaining, and weekends are your peak spending days`
            });
        }
    }
    // === RISK CATEGORIZATION ===
    const projectedUtilization = expectedMonthEndSpend / card.monthlyLimit;
    const probabilityOfBreach = Math.min(1.0, Math.max(0, (projectedUtilization - 0.8) / 0.3)); // Sigmoid-like
    let riskLevel;
    if (probabilityOfBreach >= 0.8)
        riskLevel = "critical";
    else if (probabilityOfBreach >= 0.6)
        riskLevel = "high";
    else if (probabilityOfBreach >= 0.3)
        riskLevel = "medium";
    else
        riskLevel = "low";
    // === EXPLANATION ===
    let explanation;
    if (probabilityOfBreach >= 0.75) {
        explanation = `Heads up! At your current pace of ₹${Math.round(currentDailyAverage)}/day, you may spend ~₹${Math.round(expectedMonthEndSpend).toLocaleString()} this month, which is ${projectedUtilization >= 1 ? 'above' : 'near'} your set limit of ₹${card.monthlyLimit.toLocaleString()}.`;
    }
    else if (probabilityOfBreach >= 0.3) {
        explanation = `You're on track to spend ~₹${Math.round(expectedMonthEndSpend).toLocaleString()} this month, which is ${((projectedUtilization * 100).toFixed(1))}% of your ₹${card.monthlyLimit.toLocaleString()} limit. Keep monitoring to stay on track.`;
    }
    else {
        explanation = `You're doing well! Projected spend of ~₹${Math.round(expectedMonthEndSpend).toLocaleString()} is comfortably within your ₹${card.monthlyLimit.toLocaleString()} limit.`;
    }
    return {
        creditCardId,
        userId,
        month,
        probabilityOfBreach: Math.round(probabilityOfBreach * 1000) / 1000,
        expectedMonthEndSpend: Math.round(expectedMonthEndSpend),
        monthlyLimit: card.monthlyLimit,
        currentSpend: Math.round(currentSpend),
        riskLevel,
        daysElapsed,
        daysRemaining,
        currentDailyAverage: Math.round(currentDailyAverage * 100) / 100,
        projectedDailyAverage: Math.round((expectedMonthEndSpend / daysInMonth) * 100) / 100,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        explanation,
        factors,
        generatedAt: new Date()
    };
};
exports.predictOverspending = predictOverspending;
/**
 * Generate predictions for multiple cards
 */
const predictOverspendingMultiple = async (userId, creditCardIds, referenceDate = new Date()) => {
    return Promise.all(creditCardIds.map(cardId => (0, exports.predictOverspending)(userId, cardId, referenceDate)));
};
exports.predictOverspendingMultiple = predictOverspendingMultiple;
