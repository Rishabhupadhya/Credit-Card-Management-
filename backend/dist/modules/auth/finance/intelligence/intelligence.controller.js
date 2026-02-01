"use strict";
/**
 * Intelligence API Controller
 *
 * HTTP handlers for ML/intelligence endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecoveryPlan = exports.analyzeCashFlow = exports.getPaymentPriority = exports.getCreditScoreImprovementPlan = exports.updateIntelligenceConfig = exports.getIntelligenceConfig = exports.getIntelligenceDashboard = exports.getAllInsights = exports.getCashFlow = exports.checkTransactionAnomaly = exports.getAnomalyStats = exports.getPredictions = exports.getCardAnomalies = exports.getUtilizationSummary = exports.getUtilizationAnalysis = exports.getPredictionsBatch = exports.getOverspendingPrediction = exports.getSpendingProfile = void 0;
const spendingProfile_service_1 = require("./spendingProfile.service");
const overspendingPrediction_service_1 = require("./overspendingPrediction.service");
const utilizationAnalysis_service_1 = require("./utilizationAnalysis.service");
const anomalyDetection_service_1 = require("./anomalyDetection.service");
const intelligenceOrchestration_service_1 = require("./intelligenceOrchestration.service");
const intelligenceConfig_model_1 = require("./intelligenceConfig.model");
const finance_model_1 = require("../finance.model");
const mongoose_1 = require("mongoose");
const logger_1 = require("../../../../utils/logger");
const creditScorePlanner_service_1 = __importDefault(require("./creditScorePlanner.service"));
const paymentPriority_service_1 = __importDefault(require("./paymentPriority.service"));
const cashFlowAnalysis_service_1 = __importDefault(require("./cashFlowAnalysis.service"));
const recoveryPlanner_service_1 = __importDefault(require("./recoveryPlanner.service"));
/**
 * GET /intelligence/profile/:cardId
 * Get spending behavior profile for a card
 */
const getSpendingProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardId } = req.params;
        const { months = 6 } = req.query;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const profile = await (0, spendingProfile_service_1.generateSpendingProfile)(userId, cardId, parseInt(months) || 6);
        res.json(profile);
    }
    catch (error) {
        logger_1.logger.error("Error fetching spending profile:", error);
        res.status(500).json({ error: "Failed to generate spending profile" });
    }
};
exports.getSpendingProfile = getSpendingProfile;
/**
 * GET /intelligence/prediction/:cardId
 * Get overspending prediction for a card
 */
const getOverspendingPrediction = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const prediction = await (0, overspendingPrediction_service_1.predictOverspending)(userId, cardId);
        if (!prediction) {
            return res.status(404).json({ error: "Card not found or no monthly limit set" });
        }
        res.json(prediction);
    }
    catch (error) {
        logger_1.logger.error("Error generating prediction:", error);
        res.status(500).json({ error: "Failed to generate overspending prediction" });
    }
};
exports.getOverspendingPrediction = getOverspendingPrediction;
/**
 * POST /intelligence/prediction/batch
 * Get predictions for multiple cards
 */
const getPredictionsBatch = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardIds } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!Array.isArray(cardIds)) {
            return res.status(400).json({ error: "cardIds must be an array" });
        }
        const predictions = await (0, overspendingPrediction_service_1.predictOverspendingMultiple)(userId, cardIds);
        res.json(predictions);
    }
    catch (error) {
        logger_1.logger.error("Error generating batch predictions:", error);
        res.status(500).json({ error: "Failed to generate predictions" });
    }
};
exports.getPredictionsBatch = getPredictionsBatch;
/**
 * GET /intelligence/utilization/:cardId
 * Get utilization analysis for a card
 */
const getUtilizationAnalysis = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const analysis = await (0, utilizationAnalysis_service_1.analyzeUtilization)(userId, cardId);
        if (!analysis) {
            return res.status(404).json({ error: "Card not found or invalid credit limit" });
        }
        res.json(analysis);
    }
    catch (error) {
        logger_1.logger.error("Error analyzing utilization:", error);
        res.status(500).json({ error: "Failed to analyze utilization" });
    }
};
exports.getUtilizationAnalysis = getUtilizationAnalysis;
/**
 * GET /intelligence/utilization/summary
 * Get utilization summary across all cards
 */
const getUtilizationSummary = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const summary = await (0, utilizationAnalysis_service_1.getUserUtilizationSummary)(userId);
        res.json(summary);
    }
    catch (error) {
        logger_1.logger.error("Error fetching utilization summary:", error);
        res.status(500).json({ error: "Failed to fetch utilization summary" });
    }
};
exports.getUtilizationSummary = getUtilizationSummary;
/**
 * GET /intelligence/anomalies/:cardId
 * Get anomalies for a specific card
 */
const getCardAnomalies = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardId } = req.params;
        const { days = 30 } = req.query;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const anomalies = await (0, anomalyDetection_service_1.detectRecentAnomalies)(userId, cardId, parseInt(days) || 30);
        res.json(anomalies);
    }
    catch (error) {
        logger_1.logger.error("Error detecting anomalies:", error);
        res.status(500).json({ error: "Failed to detect anomalies" });
    }
};
exports.getCardAnomalies = getCardAnomalies;
/**
 * GET /intelligence/anomalies
 * Get anomalies across all cards
 */
const getPredictions = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardIds, days = 30 } = req.query;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        let cardIdArray;
        if (typeof cardIds === "string") {
            cardIdArray = cardIds.split(",");
        }
        else if (Array.isArray(cardIds)) {
            cardIdArray = cardIds.filter((id) => typeof id === "string");
        }
        else {
            return res.status(400).json({ error: "cardIds query parameter required" });
        }
        const anomalies = await (0, anomalyDetection_service_1.detectAnomaliesAllCards)(userId, cardIdArray, parseInt(days) || 30);
        res.json(anomalies);
    }
    catch (error) {
        logger_1.logger.error("Error detecting anomalies:", error);
        res.status(500).json({ error: "Failed to detect anomalies" });
    }
};
exports.getPredictions = getPredictions;
/**
 * GET /intelligence/anomalies/:cardId/stats
 * Get anomaly statistics for a card
 */
const getAnomalyStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardId } = req.params;
        const { days = 90 } = req.query;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const stats = await (0, anomalyDetection_service_1.getAnomalyStatistics)(userId, cardId, parseInt(days) || 90);
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error("Error fetching anomaly statistics:", error);
        res.status(500).json({ error: "Failed to fetch anomaly statistics" });
    }
};
exports.getAnomalyStats = getAnomalyStats;
/**
 * POST /intelligence/anomalies/check
 * Check if a specific transaction is anomalous
 */
const checkTransactionAnomaly = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { transactionId, cardId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!transactionId || !cardId) {
            return res.status(400).json({ error: "transactionId and cardId are required" });
        }
        const transaction = await finance_model_1.Transaction.findOne({
            _id: new mongoose_1.Types.ObjectId(transactionId),
            userId: new mongoose_1.Types.ObjectId(userId)
        });
        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }
        const result = await (0, anomalyDetection_service_1.detectTransactionAnomaly)(userId, cardId, transaction);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error("Error checking transaction anomaly:", error);
        res.status(500).json({ error: "Failed to check transaction anomaly" });
    }
};
exports.checkTransactionAnomaly = checkTransactionAnomaly;
/**
 * GET /intelligence/insights/:cardId
 * Get comprehensive intelligence insights for a card
 */
const getCashFlow = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const insights = await (0, intelligenceOrchestration_service_1.generateIntelligenceInsights)(userId, cardId);
        if (!insights) {
            return res.status(404).json({ error: "Card not found" });
        }
        res.json(insights);
    }
    catch (error) {
        logger_1.logger.error("Error generating insights:", error);
        res.status(500).json({ error: "Failed to generate insights" });
    }
};
exports.getCashFlow = getCashFlow;
/**
 * GET /intelligence/insights
 * Get insights for all user cards
 */
const getAllInsights = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const insights = await (0, intelligenceOrchestration_service_1.generateInsightsAllCards)(userId);
        res.json(insights);
    }
    catch (error) {
        logger_1.logger.error("Error generating insights:", error);
        res.status(500).json({ error: "Failed to generate insights" });
    }
};
exports.getAllInsights = getAllInsights;
/**
 * GET /intelligence/dashboard
 * Get aggregated intelligence dashboard
 */
const getIntelligenceDashboard = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const dashboard = await (0, intelligenceOrchestration_service_1.getAggregatedIntelligence)(userId);
        res.json(dashboard);
    }
    catch (error) {
        logger_1.logger.error("Error fetching dashboard:", error);
        res.status(500).json({ error: "Failed to fetch intelligence dashboard" });
    }
};
exports.getIntelligenceDashboard = getIntelligenceDashboard;
/**
 * GET /intelligence/config
 * Get user's intelligence configuration
 */
const getIntelligenceConfig = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardId } = req.query;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const query = { userId: new mongoose_1.Types.ObjectId(userId) };
        if (cardId) {
            query.creditCardId = new mongoose_1.Types.ObjectId(cardId);
        }
        let config = await intelligenceConfig_model_1.IntelligenceConfig.findOne(query);
        if (!config) {
            // Return default config
            config = new intelligenceConfig_model_1.IntelligenceConfig({ userId: new mongoose_1.Types.ObjectId(userId) });
        }
        res.json(config);
    }
    catch (error) {
        logger_1.logger.error("Error fetching config:", error);
        res.status(500).json({ error: "Failed to fetch configuration" });
    }
};
exports.getIntelligenceConfig = getIntelligenceConfig;
/**
 * PUT /intelligence/config
 * Update intelligence configuration
 */
const updateIntelligenceConfig = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { cardId, ...updates } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const query = { userId: new mongoose_1.Types.ObjectId(userId) };
        if (cardId) {
            query.creditCardId = new mongoose_1.Types.ObjectId(cardId);
        }
        const config = await intelligenceConfig_model_1.IntelligenceConfig.findOneAndUpdate(query, { $set: updates }, { new: true, upsert: true });
        logger_1.logger.info(`Updated intelligence config for user ${userId}`);
        res.json(config);
    }
    catch (error) {
        logger_1.logger.error("Error updating config:", error);
        res.status(500).json({ error: "Failed to update configuration" });
    }
};
exports.updateIntelligenceConfig = updateIntelligenceConfig;
/**
 * ═══════════════════════════════════════════════════════════
 * CREDIT SCORE IMPROVEMENT & PAYMENT PRIORITY ENDPOINTS
 * ═══════════════════════════════════════════════════════════
 */
/**
 * GET /intelligence/credit-score/improvement-plan
 * Get personalized credit score improvement plan
 */
const getCreditScoreImprovementPlan = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Mock payment history for now (should be fetched from database)
        const paymentHistory = [];
        const plan = await creditScorePlanner_service_1.default.generateImprovementPlan(userId, paymentHistory);
        res.json(plan);
    }
    catch (error) {
        logger_1.logger.error("Error generating credit score plan:", error);
        res.status(500).json({ error: "Failed to generate improvement plan" });
    }
};
exports.getCreditScoreImprovementPlan = getCreditScoreImprovementPlan;
/**
 * GET /intelligence/payment-priority
 * Get payment priority for all credit cards
 */
const getPaymentPriority = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const priority = await paymentPriority_service_1.default.generatePaymentPriority(userId);
        res.json(priority);
    }
    catch (error) {
        logger_1.logger.error("Error generating payment priority:", error);
        res.status(500).json({ error: "Failed to generate payment priority" });
    }
};
exports.getPaymentPriority = getPaymentPriority;
/**
 * POST /intelligence/cash-flow/analyze
 * Analyze cash flow feasibility
 *
 * Body: { monthlyIncome, fixedExpenses, variableExpenses }
 */
const analyzeCashFlow = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { monthlyIncome, fixedExpenses, variableExpenses } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!monthlyIncome || fixedExpenses === undefined || variableExpenses === undefined) {
            return res.status(400).json({
                error: "monthlyIncome, fixedExpenses, and variableExpenses are required"
            });
        }
        const analysis = await cashFlowAnalysis_service_1.default.analyzeCashFlow(userId, monthlyIncome, fixedExpenses, variableExpenses);
        // Add summary
        const summary = cashFlowAnalysis_service_1.default.generateCashFlowSummary(analysis);
        res.json({
            ...analysis,
            summary
        });
    }
    catch (error) {
        logger_1.logger.error("Error analyzing cash flow:", error);
        res.status(500).json({ error: "Failed to analyze cash flow" });
    }
};
exports.analyzeCashFlow = analyzeCashFlow;
/**
 * POST /intelligence/recovery-plan
 * Get recovery plan when shortfall exists
 *
 * Body: { monthlyIncome, fixedExpenses, variableExpenses }
 */
const getRecoveryPlan = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { monthlyIncome, fixedExpenses, variableExpenses } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!monthlyIncome || fixedExpenses === undefined || variableExpenses === undefined) {
            return res.status(400).json({
                error: "monthlyIncome, fixedExpenses, and variableExpenses are required"
            });
        }
        // First analyze cash flow
        const cashFlowAnalysis = await cashFlowAnalysis_service_1.default.analyzeCashFlow(userId, monthlyIncome, fixedExpenses, variableExpenses);
        // Then generate recovery plan
        const recoveryPlan = await recoveryPlanner_service_1.default.generateRecoveryPlan(cashFlowAnalysis);
        res.json(recoveryPlan);
    }
    catch (error) {
        logger_1.logger.error("Error generating recovery plan:", error);
        res.status(500).json({ error: "Failed to generate recovery plan" });
    }
};
exports.getRecoveryPlan = getRecoveryPlan;
