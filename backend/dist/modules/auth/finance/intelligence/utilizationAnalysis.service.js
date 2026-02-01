"use strict";
/**
 * Credit Utilization Intelligence Analyzer
 *
 * Real-time credit utilization tracking with risk categorization.
 *
 * Key Metrics:
 * - Current utilization = (outstanding + current month spending) / credit limit
 * - Trend analysis (vs last 3 months)
 * - Risk categorization
 * - Actionable recommendations
 *
 * Why this matters:
 * - High utilization (>75%) negatively impacts credit score
 * - Persistent high utilization may indicate financial stress
 * - Early warnings help users take corrective action
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserUtilizationSummary = exports.analyzeUtilizationMultiple = exports.analyzeUtilization = void 0;
const mongoose_1 = require("mongoose");
const creditCard_model_1 = require("../creditCard.model");
const finance_model_1 = require("../finance.model");
const monthlySpending_service_1 = require("../sms/monthlySpending.service");
const logger_1 = require("../../../../utils/logger");
/**
 * Get utilization for a specific month
 */
const getMonthUtilization = async (userId, creditCardId, monthDate, creditLimit) => {
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const transactions = await finance_model_1.Transaction.find({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        type: "expense",
        paymentType: "credit",
        date: { $gte: monthStart, $lte: monthEnd }
    });
    const monthSpend = transactions.reduce((sum, t) => sum + t.amount, 0);
    return creditLimit > 0 ? (monthSpend / creditLimit) * 100 : 0;
};
/**
 * Analyze credit utilization with trend and risk assessment
 *
 * @param userId User ID
 * @param creditCardId Credit card ID
 * @param referenceDate Date for analysis (defaults to now)
 * @returns Utilization analysis with recommendations
 */
const analyzeUtilization = async (userId, creditCardId, referenceDate = new Date()) => {
    logger_1.logger.info(`Analyzing utilization for card ${creditCardId}`);
    // Get card details
    const card = await creditCard_model_1.CreditCard.findOne({
        _id: new mongoose_1.Types.ObjectId(creditCardId),
        userId: new mongoose_1.Types.ObjectId(userId),
        isActive: true
    });
    if (!card || !card.creditLimit || card.creditLimit <= 0) {
        logger_1.logger.warn(`Card not found or invalid credit limit: ${creditCardId}`);
        return null;
    }
    const month = (0, monthlySpending_service_1.getCurrentMonth)(referenceDate);
    const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    // Get current month transactions
    const currentMonthTransactions = await finance_model_1.Transaction.find({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        type: "expense",
        paymentType: "credit",
        date: { $gte: monthStart, $lte: referenceDate }
    });
    const currentMonthSpending = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    // Calculate current balance (outstanding from previous periods + current month)
    const currentBalance = (card.outstandingAmount || 0) + currentMonthSpending;
    const utilizationPercent = (currentBalance / card.creditLimit) * 100;
    // === RISK CATEGORIZATION ===
    let riskCategory;
    if (utilizationPercent < 30)
        riskCategory = "healthy";
    else if (utilizationPercent < 50)
        riskCategory = "moderate";
    else if (utilizationPercent < 75)
        riskCategory = "risky";
    else
        riskCategory = "critical";
    // === HISTORICAL TREND ANALYSIS ===
    // Get last 6 months utilization
    const historicalUtilization = [];
    for (let i = 1; i <= 6; i++) {
        const pastDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 15);
        const utilization = await getMonthUtilization(userId, creditCardId, pastDate, card.creditLimit);
        historicalUtilization.push(utilization);
    }
    const validHistory = historicalUtilization.filter(u => u > 0);
    const averageUtilization = validHistory.length > 0
        ? validHistory.reduce((sum, u) => sum + u, 0) / validHistory.length
        : utilizationPercent;
    const peakUtilization = Math.max(...validHistory, utilizationPercent);
    const lowestUtilization = validHistory.length > 0
        ? Math.min(...validHistory, utilizationPercent)
        : utilizationPercent;
    // Determine trend (compare current with last 3 months average)
    const recentHistory = historicalUtilization.slice(0, 3).filter(u => u > 0);
    const recentAverage = recentHistory.length > 0
        ? recentHistory.reduce((sum, u) => sum + u, 0) / recentHistory.length
        : utilizationPercent;
    let trend;
    const trendThreshold = 5; // 5% change to be considered trend
    if (utilizationPercent < recentAverage - trendThreshold) {
        trend = "improving";
    }
    else if (utilizationPercent > recentAverage + trendThreshold) {
        trend = "worsening";
    }
    else {
        trend = "stable";
    }
    // === RECOMMENDATIONS ===
    let recommendation;
    let actionRequired;
    if (riskCategory === "critical") {
        recommendation = `⚠️ URGENT: Your utilization is at ${utilizationPercent.toFixed(1)}%, which can significantly harm your credit score. Pay down ₹${Math.round(currentBalance - card.creditLimit * 0.3).toLocaleString()} to bring it below 30%.`;
        actionRequired = true;
    }
    else if (riskCategory === "risky") {
        recommendation = `Your utilization is ${utilizationPercent.toFixed(1)}%, which is in the risky zone. Try to pay down ₹${Math.round(currentBalance - card.creditLimit * 0.3).toLocaleString()} before your billing cycle ends to protect your credit score.`;
        actionRequired = true;
    }
    else if (riskCategory === "moderate") {
        if (trend === "worsening") {
            recommendation = `Your utilization (${utilizationPercent.toFixed(1)}%) is trending upward. Consider making a payment soon to keep it below 50%.`;
            actionRequired = false;
        }
        else {
            recommendation = `Your utilization of ${utilizationPercent.toFixed(1)}% is in the safe zone. Aim to keep it below 30% for optimal credit health.`;
            actionRequired = false;
        }
    }
    else {
        recommendation = `Excellent! Your utilization is ${utilizationPercent.toFixed(1)}%, which is ideal for maintaining a strong credit score. Keep it up!`;
        actionRequired = false;
    }
    // Add trend-specific advice
    if (trend === "worsening" && riskCategory !== "healthy") {
        recommendation += ` Note: Your utilization has increased by ${(utilizationPercent - recentAverage).toFixed(1)}% compared to recent months.`;
    }
    else if (trend === "improving") {
        recommendation += ` Great job! Your utilization has improved by ${(recentAverage - utilizationPercent).toFixed(1)}% compared to recent months.`;
    }
    return {
        creditCardId,
        userId,
        currentBalance: Math.round(currentBalance),
        creditLimit: card.creditLimit,
        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
        riskCategory,
        trend,
        changeFromLastMonth: 0, // Would need previous month data
        averageUtilization: Math.round(averageUtilization * 100) / 100,
        peakUtilization: Math.round(peakUtilization * 100) / 100,
        lowestUtilization: Math.round(lowestUtilization * 100) / 100,
        recommendation,
        actionRequired,
        analyzedAt: new Date()
    };
};
exports.analyzeUtilization = analyzeUtilization;
/**
 * Analyze utilization for multiple cards
 */
const analyzeUtilizationMultiple = async (userId, creditCardIds, referenceDate = new Date()) => {
    return Promise.all(creditCardIds.map(cardId => (0, exports.analyzeUtilization)(userId, cardId, referenceDate)));
};
exports.analyzeUtilizationMultiple = analyzeUtilizationMultiple;
/**
 * Get utilization summary across all user cards
 */
const getUserUtilizationSummary = async (userId, referenceDate = new Date()) => {
    const cards = await creditCard_model_1.CreditCard.find({
        userId: new mongoose_1.Types.ObjectId(userId),
        isActive: true
    });
    let totalBalance = 0;
    let totalCreditLimit = 0;
    let cardsAtRisk = 0;
    let highestUtilization = 0;
    let highestUtilizationCard = null;
    for (const card of cards) {
        if (!card.creditLimit || card.creditLimit <= 0)
            continue;
        const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        const transactions = await finance_model_1.Transaction.find({
            userId: new mongoose_1.Types.ObjectId(userId),
            creditCardId: card._id,
            type: "expense",
            paymentType: "credit",
            date: { $gte: monthStart, $lte: referenceDate }
        });
        const monthSpend = transactions.reduce((sum, t) => sum + t.amount, 0);
        const balance = (card.outstandingAmount || 0) + monthSpend;
        const utilization = (balance / card.creditLimit) * 100;
        totalBalance += balance;
        totalCreditLimit += card.creditLimit;
        if (utilization >= 50)
            cardsAtRisk++;
        if (utilization > highestUtilization) {
            highestUtilization = utilization;
            highestUtilizationCard = card._id.toString();
        }
    }
    return {
        totalBalance: Math.round(totalBalance),
        totalCreditLimit,
        overallUtilization: totalCreditLimit > 0
            ? Math.round((totalBalance / totalCreditLimit) * 10000) / 100
            : 0,
        cardsAtRisk,
        highestUtilizationCard
    };
};
exports.getUserUtilizationSummary = getUserUtilizationSummary;
