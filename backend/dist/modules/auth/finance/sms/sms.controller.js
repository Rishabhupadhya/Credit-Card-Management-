"use strict";
/**
 * SMS Processing Controller
 *
 * HTTP handlers for SMS processing endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlySpendingOverview = exports.getSupportedBanksList = exports.testSmsParser = exports.processSmsMessage = void 0;
const smsProcessing_service_1 = require("./smsProcessing.service");
const monthlySpending_service_1 = require("./monthlySpending.service");
const logger_1 = require("../../../../utils/logger");
/**
 * POST /sms/process
 * Process incoming credit card SMS
 *
 * Body: { smsText: string, receivedAt?: string }
 */
const processSmsMessage = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { smsText, receivedAt } = req.body;
        if (!smsText || typeof smsText !== "string") {
            return res.status(400).json({ message: "smsText is required and must be a string" });
        }
        const receivedDate = receivedAt ? new Date(receivedAt) : new Date();
        const result = await (0, smsProcessing_service_1.processSms)(userId, smsText, receivedDate);
        if (result.success) {
            logger_1.logger.info(`SMS processed successfully for user ${userId}`);
            return res.status(200).json(result);
        }
        else {
            return res.status(400).json(result);
        }
    }
    catch (error) {
        logger_1.logger.error("Error in processSmsMessage controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process SMS",
            error: error.message
        });
    }
};
exports.processSmsMessage = processSmsMessage;
/**
 * POST /sms/test-parse
 * Test SMS parsing without saving to database
 *
 * Body: { smsText: string }
 */
const testSmsParser = async (req, res) => {
    try {
        const { smsText } = req.body;
        if (!smsText || typeof smsText !== "string") {
            return res.status(400).json({ message: "smsText is required and must be a string" });
        }
        const parsedData = (0, smsProcessing_service_1.testSmsParsing)(smsText);
        if (parsedData) {
            return res.status(200).json({
                success: true,
                message: "SMS parsed successfully",
                parsedData
            });
        }
        else {
            return res.status(200).json({
                success: false,
                message: "SMS could not be parsed or is not a valid transaction SMS"
            });
        }
    }
    catch (error) {
        logger_1.logger.error("Error in testSmsParser controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to test SMS parsing",
            error: error.message
        });
    }
};
exports.testSmsParser = testSmsParser;
/**
 * GET /sms/supported-banks
 * Get list of supported banks
 */
const getSupportedBanksList = async (req, res) => {
    try {
        const banks = (0, smsProcessing_service_1.getSupportedBanks)();
        return res.status(200).json({
            success: true,
            banks,
            count: banks.length
        });
    }
    catch (error) {
        logger_1.logger.error("Error in getSupportedBanksList controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get supported banks",
            error: error.message
        });
    }
};
exports.getSupportedBanksList = getSupportedBanksList;
/**
 * GET /sms/monthly-spending
 * Get user's monthly spending across all cards
 *
 * Query: { month?: string } (YYYY-MM format)
 */
const getMonthlySpendingOverview = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const month = req.query.month || (0, monthlySpending_service_1.getCurrentMonth)();
        const spendingRecords = await (0, monthlySpending_service_1.getUserMonthlySpending)(userId, month);
        const totalSpent = spendingRecords.reduce((sum, record) => sum + record.totalSpent, 0);
        const totalTransactions = spendingRecords.reduce((sum, record) => sum + record.transactionCount, 0);
        return res.status(200).json({
            success: true,
            month,
            totalSpent,
            totalTransactions,
            cards: spendingRecords
        });
    }
    catch (error) {
        logger_1.logger.error("Error in getMonthlySpendingOverview controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get monthly spending",
            error: error.message
        });
    }
};
exports.getMonthlySpendingOverview = getMonthlySpendingOverview;
