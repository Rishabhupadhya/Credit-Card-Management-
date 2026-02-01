"use strict";
/**
 * Intelligence Orchestration Service
 *
 * Central coordinator for all ML/intelligence modules.
 * Aggregates insights from:
 * 1. Spending Profile
 * 2. Overspending Prediction
 * 3. Utilization Analysis
 * 4. Anomaly Detection
 *
 * Produces:
 * - Comprehensive IntelligenceInsights
 * - Health score (0-100)
 * - Prioritized alerts
 * - Proactive notifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAggregatedIntelligence = exports.generateInsightsAllCards = exports.generateInsightsMultipleCards = exports.generateIntelligenceInsights = void 0;
const mongoose_1 = require("mongoose");
const creditCard_model_1 = require("../creditCard.model");
const intelligenceConfig_model_1 = require("./intelligenceConfig.model");
const spendingProfile_service_1 = require("./spendingProfile.service");
const overspendingPrediction_service_1 = require("./overspendingPrediction.service");
const utilizationAnalysis_service_1 = require("./utilizationAnalysis.service");
const anomalyDetection_service_1 = require("./anomalyDetection.service");
const logger_1 = require("../../../../utils/logger");
/**
 * Calculate overall financial health score (0-100)
 *
 * Factors:
 * - Utilization (40%): Lower is better
 * - Overspending risk (30%): Lower is better
 * - Anomaly rate (15%): Lower is better
 * - Spending consistency (15%): Lower volatility is better
 */
const calculateHealthScore = (utilizationPercent, overspendingProbability, anomalyRate, coefficientOfVariation) => {
    // Utilization score (0-100, inverted)
    const utilizationScore = Math.max(0, 100 - (utilizationPercent * 1.2));
    // Overspending score (0-100, inverted)
    const overspendingScore = Math.max(0, 100 - (overspendingProbability * 100));
    // Anomaly score (0-100, inverted, capped at 10% anomaly rate)
    const anomalyScore = Math.max(0, 100 - (Math.min(anomalyRate, 10) * 10));
    // Consistency score (0-100, inverted, capped at CoV of 2.0)
    const consistencyScore = Math.max(0, 100 - (Math.min(coefficientOfVariation, 2.0) * 50));
    // Weighted average
    const healthScore = (utilizationScore * 0.40) +
        (overspendingScore * 0.30) +
        (anomalyScore * 0.15) +
        (consistencyScore * 0.15);
    return Math.round(healthScore);
};
/**
 * Generate alerts based on insights
 */
const generateAlerts = (prediction, utilization, anomalies, config) => {
    const alerts = [];
    // Overspending alert
    if (prediction && prediction.probabilityOfBreach >= config.overspendingAlertThreshold) {
        alerts.push({
            type: "overspending_risk",
            severity: prediction.riskLevel === "critical" ? "critical" : prediction.riskLevel === "high" ? "warning" : "info",
            message: prediction.explanation,
            actionable: true
        });
    }
    // Utilization alert
    if (utilization) {
        if (utilization.riskCategory === "critical" && utilization.utilizationPercent >= config.utilizationCriticalThreshold) {
            alerts.push({
                type: "high_utilization",
                severity: "critical",
                message: utilization.recommendation,
                actionable: utilization.actionRequired
            });
        }
        else if (utilization.riskCategory === "risky" && utilization.utilizationPercent >= config.utilizationWarningThreshold) {
            alerts.push({
                type: "high_utilization",
                severity: "warning",
                message: utilization.recommendation,
                actionable: utilization.actionRequired
            });
        }
    }
    // Anomaly alerts (only high severity)
    const highSeverityAnomalies = anomalies.filter(a => a.severity === "high");
    if (highSeverityAnomalies.length > 0) {
        alerts.push({
            type: "anomaly_detected",
            severity: "warning",
            message: `Detected ${highSeverityAnomalies.length} unusual transaction${highSeverityAnomalies.length > 1 ? 's' : ''} in the last 30 days. Review them to ensure they're legitimate.`,
            actionable: true
        });
    }
    // Budget health alert
    if (utilization && prediction) {
        if (utilization.trend === "worsening" && prediction.riskLevel !== "low") {
            alerts.push({
                type: "anomaly_detected",
                severity: "warning",
                message: "Your spending is trending upward and you may exceed your budget. Consider reviewing your expenses.",
                actionable: true
            });
        }
    }
    // Sort by severity: critical > warning > info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => (severityOrder[a.severity] || 999) - (severityOrder[b.severity] || 999));
};
/**
 * Generate comprehensive intelligence insights for a credit card
 *
 * @param userId User ID
 * @param creditCardId Credit card ID
 * @param referenceDate Date for analysis (defaults to now)
 * @returns Complete intelligence insights
 */
const generateIntelligenceInsights = async (userId, creditCardId, referenceDate = new Date()) => {
    logger_1.logger.info(`Generating intelligence insights for card ${creditCardId}`);
    // Verify card exists
    const card = await creditCard_model_1.CreditCard.findOne({
        _id: new mongoose_1.Types.ObjectId(creditCardId),
        userId: new mongoose_1.Types.ObjectId(userId),
        isActive: true
    });
    if (!card) {
        logger_1.logger.warn(`Card not found: ${creditCardId}`);
        return null;
    }
    // Get user configuration (or use defaults)
    let config = await intelligenceConfig_model_1.IntelligenceConfig.findOne({
        userId: new mongoose_1.Types.ObjectId(userId),
        $or: [
            { creditCardId: new mongoose_1.Types.ObjectId(creditCardId) }, // Card-specific
            { creditCardId: { $exists: false } } // Global
        ]
    });
    if (!config) {
        // Create default config
        config = await intelligenceConfig_model_1.IntelligenceConfig.create({
            userId: new mongoose_1.Types.ObjectId(userId)
        });
        logger_1.logger.info(`Created default intelligence config for user ${userId}`);
    }
    // === RUN ALL INTELLIGENCE MODULES ===
    const [profile, prediction, utilization, anomalies] = await Promise.all([
        // Module 1: Spending Profile
        (0, spendingProfile_service_1.generateSpendingProfile)(userId, creditCardId, 6),
        // Module 2: Overspending Prediction
        config.enableOverspendingPrediction
            ? (0, overspendingPrediction_service_1.predictOverspending)(userId, creditCardId, referenceDate)
            : Promise.resolve(null),
        // Module 3: Utilization Analysis
        (0, utilizationAnalysis_service_1.analyzeUtilization)(userId, creditCardId, referenceDate),
        // Module 4: Anomaly Detection
        config.enableAnomalyDetection
            ? (0, anomalyDetection_service_1.detectRecentAnomalies)(userId, creditCardId, 30, config.anomalyZScoreThreshold)
            : Promise.resolve([])
    ]);
    // === CALCULATE HEALTH SCORE ===
    const healthScore = calculateHealthScore(utilization?.utilizationPercent || 0, prediction?.probabilityOfBreach || 0, anomalies.length > 0 ? (anomalies.length / Math.max(profile.dataPoints, 30)) * 100 : 0, profile.coefficientOfVariation || 0);
    // === GENERATE ALERTS ===
    const alerts = config.enableProactiveAlerts
        ? generateAlerts(prediction, utilization, anomalies, config)
        : [];
    logger_1.logger.info(`Generated ${alerts.length} alerts for card ${creditCardId}`);
    return {
        creditCardId,
        userId,
        spendingProfile: profile,
        overspendingPrediction: prediction || undefined,
        utilizationAnalysis: utilization || undefined,
        recentAnomalies: anomalies.length > 0 ? anomalies : [],
        healthScore,
        activeAlerts: alerts,
        generatedAt: new Date()
    };
};
exports.generateIntelligenceInsights = generateIntelligenceInsights;
/**
 * Generate insights for multiple cards
 */
const generateInsightsMultipleCards = async (userId, creditCardIds, referenceDate = new Date()) => {
    return Promise.all(creditCardIds.map(cardId => (0, exports.generateIntelligenceInsights)(userId, cardId, referenceDate)));
};
exports.generateInsightsMultipleCards = generateInsightsMultipleCards;
/**
 * Generate insights for all user cards
 */
const generateInsightsAllCards = async (userId, referenceDate = new Date()) => {
    const cards = await creditCard_model_1.CreditCard.find({
        userId: new mongoose_1.Types.ObjectId(userId),
        isActive: true
    });
    const cardIds = cards.map(c => c._id.toString());
    const insights = await (0, exports.generateInsightsMultipleCards)(userId, cardIds, referenceDate);
    return insights.filter(i => i !== null);
};
exports.generateInsightsAllCards = generateInsightsAllCards;
/**
 * Get aggregated intelligence summary across all cards
 */
const getAggregatedIntelligence = async (userId, referenceDate = new Date()) => {
    const insights = await (0, exports.generateInsightsAllCards)(userId, referenceDate);
    const totalAlerts = insights.reduce((sum, i) => sum + i.activeAlerts.length, 0);
    const criticalAlerts = insights.reduce((sum, i) => sum + i.activeAlerts.filter(a => a.severity === "critical").length, 0);
    const cardsAtRisk = insights.filter(i => i.utilizationAnalysis && (i.utilizationAnalysis.riskCategory === "risky" || i.utilizationAnalysis.riskCategory === "critical")).length;
    const totalAnomalies = insights.reduce((sum, i) => sum + (i.recentAnomalies?.length || 0), 0);
    const avgHealthScore = insights.length > 0
        ? Math.round(insights.reduce((sum, i) => sum + i.healthScore, 0) / insights.length)
        : 0;
    // Overall utilization across all cards
    let totalBalance = 0;
    let totalLimit = 0;
    insights.forEach(i => {
        if (i.utilizationAnalysis) {
            totalBalance += i.utilizationAnalysis.currentBalance;
            totalLimit += i.utilizationAnalysis.creditLimit;
        }
    });
    const overallUtilization = totalLimit > 0
        ? Math.round((totalBalance / totalLimit) * 10000) / 100
        : 0;
    return {
        totalCards: insights.length,
        averageHealthScore: avgHealthScore,
        totalAlerts,
        criticalAlerts,
        cardsAtRisk,
        totalAnomalies,
        overallUtilization
    };
};
exports.getAggregatedIntelligence = getAggregatedIntelligence;
