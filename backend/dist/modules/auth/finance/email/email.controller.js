"use strict";
/**
 * Email Processing Controller
 *
 * HTTP handlers for email processing endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearEmailHistory = exports.getSupportedBanksList = exports.getEmailStats = exports.disconnectEmailAccount = exports.getOAuthStatus = exports.processUserEmails = exports.handleOutlookCallback = exports.handleGmailCallback = exports.getOutlookOAuthUrl = exports.getGmailOAuthUrl = void 0;
const emailProcessing_service_1 = require("./emailProcessing.service");
const emailAuth_service_1 = require("./emailAuth.service");
const deduplication_service_1 = require("./deduplication.service");
const emailOAuthToken_model_1 = require("./models/emailOAuthToken.model");
const emailMetadata_model_1 = require("./models/emailMetadata.model");
const processedEmail_model_1 = require("./models/processedEmail.model");
const finance_model_1 = require("../finance.model");
const mongoose_1 = require("mongoose");
const logger_1 = require("../../../../utils/logger");
/**
 * GET /email/oauth/gmail/authorize
 * Get Gmail OAuth authorization URL
 */
const getGmailOAuthUrl = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const authUrl = (0, emailAuth_service_1.getGmailAuthUrl)(userId);
        return res.status(200).json({
            success: true,
            authUrl,
            message: "Redirect user to this URL to grant Gmail access"
        });
    }
    catch (error) {
        logger_1.logger.error("Error in getGmailOAuthUrl:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate Gmail OAuth URL",
            error: error.message
        });
    }
};
exports.getGmailOAuthUrl = getGmailOAuthUrl;
/**
 * GET /email/oauth/outlook/authorize
 * Get Outlook OAuth authorization URL
 */
const getOutlookOAuthUrl = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const authUrl = (0, emailAuth_service_1.getOutlookAuthUrl)(userId);
        return res.status(200).json({
            success: true,
            authUrl,
            message: "Redirect user to this URL to grant Outlook access"
        });
    }
    catch (error) {
        logger_1.logger.error("Error in getOutlookOAuthUrl:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate Outlook OAuth URL",
            error: error.message
        });
    }
};
exports.getOutlookOAuthUrl = getOutlookOAuthUrl;
/**
 * GET /email/oauth/gmail/callback
 * OAuth callback after user grants permission
 */
const handleGmailCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || !state) {
            return res.status(400).json({ message: "Missing code or state parameter" });
        }
        const userId = state;
        // Exchange code for access token and store in database (encrypted)
        await (0, emailAuth_service_1.exchangeGmailCode)(code, userId);
        logger_1.logger.info(`Gmail OAuth successful for user ${userId}`);
        // Redirect to frontend success page
        return res.redirect(`${process.env.FRONTEND_URL}/finance/email/connected?provider=gmail`);
    }
    catch (error) {
        logger_1.logger.error("Error in handleGmailCallback:", error);
        return res.redirect(`${process.env.FRONTEND_URL}/finance/email/error?message=Gmail+OAuth+failed`);
    }
};
exports.handleGmailCallback = handleGmailCallback;
/**
 * GET /email/oauth/outlook/callback
 * OAuth callback after user grants permission
 */
const handleOutlookCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || !state) {
            return res.status(400).json({ message: "Missing code or state parameter" });
        }
        const userId = state;
        // Exchange code for access token
        const token = await (0, emailAuth_service_1.exchangeOutlookCode)(code, userId);
        // TODO: Store token in database (encrypted!)
        // await EmailOAuthTokenModel.create(token);
        logger_1.logger.info(`Outlook OAuth successful for user ${userId}`);
        // Redirect to frontend success page
        return res.redirect(`${process.env.FRONTEND_URL}/finance/email/connected?provider=outlook`);
    }
    catch (error) {
        logger_1.logger.error("Error in handleOutlookCallback:", error);
        return res.redirect(`${process.env.FRONTEND_URL}/finance/email/error?message=Outlook+OAuth+failed`);
    }
};
exports.handleOutlookCallback = handleOutlookCallback;
/**
 * POST /email/process
 * Process emails from connected account
 *
 * Body: { provider: "gmail" | "outlook" }
 * Query: { daysBack?: number }
 */
const processUserEmails = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { provider } = req.body;
        const daysBack = parseInt(req.query.daysBack) || 7;
        logger_1.logger.info(`Processing emails with daysBack=${daysBack} for user ${userId}`);
        if (!provider || !["gmail", "outlook"].includes(provider)) {
            return res.status(400).json({ message: "Invalid provider. Must be 'gmail' or 'outlook'" });
        }
        // Get valid access token (automatically refreshes if expired)
        const accessToken = await (0, emailAuth_service_1.getValidAccessToken)(userId, provider);
        const result = await (0, emailProcessing_service_1.processEmails)(userId, provider, accessToken, daysBack);
        return res.status(200).json(result);
    }
    catch (error) {
        logger_1.logger.error("Error in processUserEmails:", error);
        // Check if it's an auth error
        if (error.message.includes("No") && error.message.includes("token")) {
            return res.status(400).json({
                success: false,
                message: "Email account not connected. Please authorize first.",
                error: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: "Failed to process emails",
            error: error.message
        });
    }
};
exports.processUserEmails = processUserEmails;
/**
 * GET /email/oauth/status
 * Check OAuth connection status
 */
const getOAuthStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Check for Gmail token
        const gmailToken = await emailOAuthToken_model_1.EmailOAuthToken.findOne({
            userId,
            provider: "gmail"
        });
        // Check for Outlook token
        const outlookToken = await emailOAuthToken_model_1.EmailOAuthToken.findOne({
            userId,
            provider: "outlook"
        });
        if (gmailToken) {
            return res.status(200).json({
                connected: true,
                provider: "gmail",
                userEmail: gmailToken.userEmail,
                connectedAt: gmailToken.createdAt
            });
        }
        if (outlookToken) {
            return res.status(200).json({
                connected: true,
                provider: "outlook",
                userEmail: outlookToken.userEmail,
                connectedAt: outlookToken.createdAt
            });
        }
        return res.status(200).json({
            connected: false,
            provider: null
        });
    }
    catch (error) {
        logger_1.logger.error("Error in getOAuthStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to check OAuth status",
            error: error.message
        });
    }
};
exports.getOAuthStatus = getOAuthStatus;
/**
 * DELETE /email/disconnect/:provider
 * Disconnect email account (revoke OAuth access)
 */
const disconnectEmailAccount = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { provider } = req.params;
        if (!["gmail", "outlook"].includes(provider)) {
            return res.status(400).json({ message: "Invalid provider" });
        }
        await (0, emailAuth_service_1.revokeEmailAccess)(userId, provider);
        return res.status(200).json({
            success: true,
            message: `${provider} account disconnected successfully`
        });
    }
    catch (error) {
        logger_1.logger.error("Error in disconnectEmailAccount:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to disconnect email account",
            error: error.message
        });
    }
};
exports.disconnectEmailAccount = disconnectEmailAccount;
/**
 * GET /email/stats
 * Get email processing statistics
 */
const getEmailStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const stats = await (0, deduplication_service_1.getProcessingStats)(userId);
        return res.status(200).json({
            success: true,
            stats
        });
    }
    catch (error) {
        logger_1.logger.error("Error in getEmailStats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get email statistics",
            error: error.message
        });
    }
};
exports.getEmailStats = getEmailStats;
/**
 * GET /email/supported-banks
 * Get list of supported banks
 */
const getSupportedBanksList = async (req, res) => {
    try {
        const banks = (0, emailProcessing_service_1.getSupportedBanks)();
        return res.status(200).json({
            success: true,
            banks,
            count: banks.length
        });
    }
    catch (error) {
        logger_1.logger.error("Error in getSupportedBanksList:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get supported banks",
            error: error.message
        });
    }
};
exports.getSupportedBanksList = getSupportedBanksList;
/**
 * DELETE /email/clear-history
 * Clear email processing history (allows reimporting same emails)
 */
const clearEmailHistory = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Get all transaction IDs from email metadata before deleting
        const emailMetadataRecords = await emailMetadata_model_1.EmailMetadata.find({
            userId: new mongoose_1.Types.ObjectId(userId),
            transactionId: { $exists: true, $ne: null }
        });
        const transactionIds = emailMetadataRecords
            .map(record => record.transactionId)
            .filter(id => id != null);
        // Delete the transactions that were created from emails
        const transactionResult = await finance_model_1.Transaction.deleteMany({
            _id: { $in: transactionIds }
        });
        // Delete email metadata
        const emailResult = await emailMetadata_model_1.EmailMetadata.deleteMany({
            userId: new mongoose_1.Types.ObjectId(userId)
        });
        // Delete processed email hashes
        const hashResult = await processedEmail_model_1.ProcessedEmail.deleteMany({
            userId: new mongoose_1.Types.ObjectId(userId)
        });
        logger_1.logger.info(`Cleared email history for user ${userId}: ${emailResult.deletedCount} emails, ${hashResult.deletedCount} hashes, ${transactionResult.deletedCount} transactions`);
        return res.status(200).json({
            success: true,
            message: "Email import history cleared",
            emailsCleared: emailResult.deletedCount,
            hashesCleared: hashResult.deletedCount,
            transactionsDeleted: transactionResult.deletedCount
        });
    }
    catch (error) {
        logger_1.logger.error("Error in clearEmailHistory:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to clear email history",
            error: error.message
        });
    }
};
exports.clearEmailHistory = clearEmailHistory;
