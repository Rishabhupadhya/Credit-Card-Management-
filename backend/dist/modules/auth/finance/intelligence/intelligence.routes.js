"use strict";
/**
 * Intelligence API Routes
 *
 * Endpoints:
 * - GET    /intelligence/profile/:cardId                - Spending behavior profile
 * - GET    /intelligence/prediction/:cardId             - Overspending prediction
 * - POST   /intelligence/prediction/batch               - Batch predictions
 * - GET    /intelligence/utilization/:cardId            - Utilization analysis
 * - GET    /intelligence/utilization/summary            - Utilization summary (all cards)
 * - GET    /intelligence/anomalies/:cardId              - Card anomalies
 * - GET    /intelligence/anomalies                      - All anomalies
 * - GET    /intelligence/anomalies/:cardId/stats        - Anomaly statistics
 * - POST   /intelligence/anomalies/check                - Check transaction anomaly
 * - GET    /intelligence/insights/:cardId               - Comprehensive insights (card)
 * - GET    /intelligence/insights                       - All insights
 * - GET    /intelligence/dashboard                      - Aggregated dashboard
 * - GET    /intelligence/config                         - Get configuration
 * - PUT    /intelligence/config                         - Update configuration
 *
 * === CREDIT SCORE & PAYMENT PRIORITY ===
 * - GET    /intelligence/credit-score/improvement-plan  - Credit score improvement plan
 * - GET    /intelligence/payment-priority               - Payment priority engine
 * - POST   /intelligence/cash-flow/analyze              - Cash flow feasibility check
 * - POST   /intelligence/recovery-plan                  - Recovery suggestions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../middleware/auth.middleware");
const intelligence_controller_1 = require("./intelligence.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// === SPENDING PROFILE ===
router.get("/profile/:cardId", intelligence_controller_1.getSpendingProfile);
// === OVERSPENDING PREDICTION ===
router.get("/prediction/:cardId", intelligence_controller_1.getOverspendingPrediction);
router.post("/prediction/batch", intelligence_controller_1.getPredictionsBatch);
// === UTILIZATION ANALYSIS ===
router.get("/utilization/:cardId", intelligence_controller_1.getUtilizationAnalysis);
router.get("/utilization/summary", intelligence_controller_1.getUtilizationSummary);
// === ANOMALY DETECTION ===
router.get("/anomalies/:cardId", intelligence_controller_1.getCardAnomalies);
router.get("/anomalies/:cardId/stats", intelligence_controller_1.getAnomalyStats);
router.post("/anomalies/check", intelligence_controller_1.checkTransactionAnomaly);
// === COMPREHENSIVE INSIGHTS ===
router.get("/insights", intelligence_controller_1.getAllInsights);
router.get("/dashboard", intelligence_controller_1.getIntelligenceDashboard);
// === CONFIGURATION ===
router.get("/config", intelligence_controller_1.getIntelligenceConfig);
router.put("/config", intelligence_controller_1.updateIntelligenceConfig);
// === CREDIT SCORE & PAYMENT PRIORITY ===
router.get("/credit-score/improvement-plan", intelligence_controller_1.getCreditScoreImprovementPlan);
router.get("/payment-priority", intelligence_controller_1.getPaymentPriority);
router.post("/cash-flow/analyze", intelligence_controller_1.analyzeCashFlow);
router.post("/recovery-plan", intelligence_controller_1.getRecoveryPlan);
exports.default = router;
