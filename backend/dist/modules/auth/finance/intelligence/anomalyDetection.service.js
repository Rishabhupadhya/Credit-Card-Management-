"use strict";
/**
 * Anomaly Detection Module
 *
 * Detects unusual transactions that deviate from user's normal spending patterns.
 *
 * Detection Methods:
 * 1. Amount-based: Transaction amount significantly higher than usual (Z-score)
 * 2. Category-based: New or rare merchant category
 * 3. Frequency-based: Multiple transactions in short time (velocity)
 * 4. Time-based: Transaction at unusual time (e.g., 3 AM)
 *
 * Use Cases:
 * - Fraud detection (early warning)
 * - Impulse purchase alerts
 * - Budget anomaly notifications
 * - Behavioral insights
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnomalyStatistics = exports.detectAnomaliesAllCards = exports.detectRecentAnomalies = exports.detectTransactionAnomaly = void 0;
const mongoose_1 = require("mongoose");
const finance_model_1 = require("../finance.model");
const spendingProfile_service_1 = require("./spendingProfile.service");
const logger_1 = require("../../../../utils/logger");
/**
 * Calculate Z-score for a value in a dataset
 */
const calculateZScore = (value, mean, stdDev) => {
    if (stdDev === 0)
        return 0;
    return (value - mean) / stdDev;
};
/**
 * Get severity level based on Z-score
 */
const getSeverity = (zScore) => {
    const absZ = Math.abs(zScore);
    if (absZ >= 3.5)
        return "high";
    if (absZ >= 2.5)
        return "medium";
    return "low";
};
/**
 * Detect anomalies in a single transaction
 *
 * @param userId User ID
 * @param creditCardId Credit card ID
 * @param transaction Transaction to analyze
 * @param zScoreThreshold Z-score threshold for anomaly (default 2.5)
 * @returns Anomaly detection result
 */
const detectTransactionAnomaly = async (userId, creditCardId, transaction, zScoreThreshold = 2.5) => {
    logger_1.logger.info(`Detecting anomalies for transaction ${transaction._id}`);
    // Get historical transactions (last 90 days, excluding current transaction)
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - 90);
    const historicalTransactions = await finance_model_1.Transaction.find({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        type: "expense",
        paymentType: "credit",
        date: { $gte: lookbackDate, $lt: transaction.date },
        _id: { $ne: transaction._id }
    });
    // If insufficient data, return no anomaly
    if (historicalTransactions.length < 10) {
        return {
            creditCardId,
            userId,
            transactionId: transaction._id.toString(),
            amount: transaction.amount,
            merchantName: transaction.description,
            category: (0, spendingProfile_service_1.categorizeMerchant)(transaction.description),
            transactionDate: transaction.date,
            isAnomaly: false,
            anomalyScore: 0,
            anomalyType: [],
            expectedRange: {
                min: 0,
                max: 0,
                mean: 0,
                stdDev: 0
            },
            deviationFromMean: 0,
            severity: "low",
            explanation: "Insufficient historical data for anomaly detection",
            comparisonBaseline: "Not enough transactions (minimum 10 required)",
            detectedAt: new Date()
        };
    }
    // === AMOUNT-BASED ANOMALY DETECTION ===
    const amounts = historicalTransactions.map(t => t.amount);
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const zScore = calculateZScore(transaction.amount, mean, stdDev);
    // === CATEGORY-BASED ANOMALY DETECTION ===
    const transactionCategory = (0, spendingProfile_service_1.categorizeMerchant)(transaction.description);
    const categoryTransactions = historicalTransactions.filter(t => (0, spendingProfile_service_1.categorizeMerchant)(t.description) === transactionCategory);
    const isNewCategory = categoryTransactions.length === 0;
    const isRareCategory = categoryTransactions.length > 0 && categoryTransactions.length < 3;
    // === FREQUENCY-BASED ANOMALY DETECTION ===
    // Check for velocity: multiple transactions in last hour
    const oneHourAgo = new Date(transaction.date.getTime() - 60 * 60 * 1000);
    const recentTransactions = await finance_model_1.Transaction.find({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        date: { $gte: oneHourAgo, $lt: transaction.date }
    });
    const isHighVelocity = recentTransactions.length >= 3;
    // === TIME-BASED ANOMALY DETECTION ===
    const hour = transaction.date.getHours();
    const isUnusualTime = hour >= 0 && hour < 5; // Between midnight and 5 AM
    // === AGGREGATION ===
    const anomalyTypes = [];
    let explanation = "";
    let comparisonBaseline = `Based on ${historicalTransactions.length} transactions over the last 90 days`;
    // Amount anomaly
    if (Math.abs(zScore) >= zScoreThreshold) {
        anomalyTypes.push("amount");
        if (zScore > 0) {
            explanation = `This ₹${transaction.amount.toLocaleString()} transaction is ${Math.abs(zScore).toFixed(1)}× higher than your typical spend of ₹${Math.round(mean).toLocaleString()} (±₹${Math.round(stdDev).toLocaleString()}).`;
        }
    }
    // Category anomaly
    if (isNewCategory) {
        anomalyTypes.push("category");
        explanation += ` This is your first transaction in the "${transactionCategory}" category.`;
    }
    else if (isRareCategory) {
        anomalyTypes.push("category");
        explanation += ` You rarely spend in the "${transactionCategory}" category (only ${categoryTransactions.length} times in 90 days).`;
    }
    // Velocity anomaly
    if (isHighVelocity) {
        anomalyTypes.push("velocity");
        explanation += ` You had ${recentTransactions.length} transactions in the past hour, which is unusual.`;
    }
    // Time anomaly
    if (isUnusualTime) {
        anomalyTypes.push("time");
        explanation += ` This transaction occurred at ${hour}:00, which is an unusual time for spending.`;
    }
    const isAnomaly = anomalyTypes.length > 0;
    const anomalyScore = isAnomaly
        ? Math.min(1.0, (Math.abs(zScore) / 5) + (anomalyTypes.length * 0.15))
        : 0;
    if (!isAnomaly) {
        explanation = `This ₹${transaction.amount.toLocaleString()} transaction at ${transaction.description} appears normal. It's within your typical spending range of ₹${Math.round(mean - stdDev).toLocaleString()} - ₹${Math.round(mean + stdDev).toLocaleString()}.`;
    }
    return {
        creditCardId,
        userId,
        transactionId: transaction._id.toString(),
        amount: transaction.amount,
        merchantName: transaction.description,
        category: transactionCategory,
        transactionDate: transaction.date,
        isAnomaly,
        anomalyScore: Math.round(anomalyScore * 1000) / 1000,
        anomalyType: anomalyTypes,
        expectedRange: {
            min: Math.round(min),
            max: Math.round(max),
            mean: Math.round(mean * 100) / 100,
            stdDev: Math.round(stdDev * 100) / 100
        },
        deviationFromMean: Math.round(zScore * 100) / 100,
        severity: getSeverity(zScore),
        explanation: explanation.trim(),
        comparisonBaseline,
        detectedAt: new Date()
    };
};
exports.detectTransactionAnomaly = detectTransactionAnomaly;
/**
 * Detect anomalies in recent transactions
 *
 * @param userId User ID
 * @param creditCardId Credit card ID
 * @param days Number of days to look back (default 30)
 * @param zScoreThreshold Z-score threshold (default 2.5)
 * @returns Array of anomalies
 */
const detectRecentAnomalies = async (userId, creditCardId, days = 30, zScoreThreshold = 2.5) => {
    logger_1.logger.info(`Detecting anomalies for last ${days} days on card ${creditCardId}`);
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - days);
    const recentTransactions = await finance_model_1.Transaction.find({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        type: "expense",
        paymentType: "credit",
        date: { $gte: lookbackDate }
    }).sort({ date: -1 });
    const anomalies = [];
    for (const transaction of recentTransactions) {
        const result = await (0, exports.detectTransactionAnomaly)(userId, creditCardId, transaction, zScoreThreshold);
        if (result.isAnomaly) {
            anomalies.push(result);
        }
    }
    logger_1.logger.info(`Found ${anomalies.length} anomalies out of ${recentTransactions.length} transactions`);
    return anomalies;
};
exports.detectRecentAnomalies = detectRecentAnomalies;
/**
 * Detect anomalies across all user cards
 */
const detectAnomaliesAllCards = async (userId, creditCardIds, days = 30, zScoreThreshold = 2.5) => {
    const allAnomalies = [];
    for (const cardId of creditCardIds) {
        const anomalies = await (0, exports.detectRecentAnomalies)(userId, cardId, days, zScoreThreshold);
        allAnomalies.push(...anomalies);
    }
    // Sort by anomaly score (highest first)
    return allAnomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
};
exports.detectAnomaliesAllCards = detectAnomaliesAllCards;
/**
 * Get anomaly statistics for a card
 */
const getAnomalyStatistics = async (userId, creditCardId, days = 90) => {
    const anomalies = await (0, exports.detectRecentAnomalies)(userId, creditCardId, days);
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - days);
    const totalTransactions = await finance_model_1.Transaction.countDocuments({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        type: "expense",
        paymentType: "credit",
        date: { $gte: lookbackDate }
    });
    const byType = {};
    const bySeverity = {};
    let totalScore = 0;
    anomalies.forEach(a => {
        a.anomalyType.forEach(type => {
            byType[type] = (byType[type] || 0) + 1;
        });
        bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
        totalScore += a.anomalyScore;
    });
    return {
        totalTransactions,
        anomaliesDetected: anomalies.length,
        anomalyRate: totalTransactions > 0
            ? Math.round((anomalies.length / totalTransactions) * 10000) / 100
            : 0,
        byType,
        bySeverity,
        averageAnomalyScore: anomalies.length > 0
            ? Math.round((totalScore / anomalies.length) * 1000) / 1000
            : 0
    };
};
exports.getAnomalyStatistics = getAnomalyStatistics;
