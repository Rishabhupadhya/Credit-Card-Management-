"use strict";
/**
 * Email Deduplication Service
 *
 * Prevents duplicate transactions by:
 * 1. Checking if email message ID was already processed
 * 2. Checking if transaction content hash already exists
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessingStats = exports.recordTransactionHash = exports.markEmailAsProcessed = exports.isTransactionDuplicate = exports.isEmailAlreadyProcessed = exports.generateContentHash = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = require("mongoose");
const emailMetadata_model_1 = require("./models/emailMetadata.model");
const processedEmail_model_1 = require("./models/processedEmail.model");
const logger_1 = require("../../../../utils/logger");
/**
 * Generate content hash for transaction deduplication
 * Hash components: amount + transaction date + merchant + card number
 */
const generateContentHash = (parsed) => {
    // Normalize data before hashing
    const amount = parsed.amount.toFixed(2); // Ensure consistent decimal format
    const date = parsed.transactionDate
        ? parsed.transactionDate.toISOString().split('T')[0] // YYYY-MM-DD only
        : parsed.emailDate.toISOString().split('T')[0];
    const merchant = parsed.merchantName.toLowerCase().trim().replace(/\s+/g, '');
    const card = parsed.maskedCardNumber || 'unknown';
    const hashInput = `${amount}|${date}|${merchant}|${card}`;
    return crypto_1.default
        .createHash('sha256')
        .update(hashInput)
        .digest('hex');
};
exports.generateContentHash = generateContentHash;
/**
 * Check if email message was already processed
 */
const isEmailAlreadyProcessed = async (userId, messageId) => {
    const existing = await emailMetadata_model_1.EmailMetadata.findOne({
        userId: new mongoose_1.Types.ObjectId(userId),
        messageId
    });
    if (existing) {
        logger_1.logger.info(`Email ${messageId} already processed at ${existing.processedAt}`);
        return true;
    }
    return false;
};
exports.isEmailAlreadyProcessed = isEmailAlreadyProcessed;
/**
 * Check if transaction content already exists (duplicate transaction)
 */
const isTransactionDuplicate = async (userId, contentHash) => {
    const existing = await processedEmail_model_1.ProcessedEmail.findOne({
        userId: new mongoose_1.Types.ObjectId(userId),
        contentHash
    });
    if (existing) {
        logger_1.logger.info(`Duplicate transaction detected (hash: ${contentHash}, original message: ${existing.messageId})`);
        return true;
    }
    return false;
};
exports.isTransactionDuplicate = isTransactionDuplicate;
/**
 * Mark email as processed with metadata
 */
const markEmailAsProcessed = async (userId, messageId, subject, from, receivedDate, parsedSuccessfully, bankName, transactionId, errorMessage, body, snippet) => {
    await emailMetadata_model_1.EmailMetadata.create({
        userId: new mongoose_1.Types.ObjectId(userId),
        messageId,
        subject,
        from,
        receivedDate,
        parsedSuccessfully,
        bankName,
        transactionId: transactionId ? new mongoose_1.Types.ObjectId(transactionId) : undefined,
        errorMessage,
        body,
        snippet
    });
    logger_1.logger.info(`Email ${messageId} marked as processed (success: ${parsedSuccessfully})`);
};
exports.markEmailAsProcessed = markEmailAsProcessed;
/**
 * Record transaction hash for deduplication
 */
const recordTransactionHash = async (userId, contentHash, messageId, transactionId) => {
    try {
        await processedEmail_model_1.ProcessedEmail.create({
            userId: new mongoose_1.Types.ObjectId(userId),
            contentHash,
            messageId,
            transactionId: transactionId ? new mongoose_1.Types.ObjectId(transactionId) : undefined
        });
        logger_1.logger.info(`Transaction hash recorded: ${contentHash}`);
    }
    catch (error) {
        // Ignore duplicate key errors (race condition)
        if (error.code === 11000) {
            logger_1.logger.warn(`Transaction hash ${contentHash} already exists (race condition)`);
        }
        else {
            throw error;
        }
    }
};
exports.recordTransactionHash = recordTransactionHash;
/**
 * Get processing statistics for user
 */
const getProcessingStats = async (userId) => {
    const [totalProcessed, successful, failed] = await Promise.all([
        emailMetadata_model_1.EmailMetadata.countDocuments({ userId: new mongoose_1.Types.ObjectId(userId) }),
        emailMetadata_model_1.EmailMetadata.countDocuments({ userId: new mongoose_1.Types.ObjectId(userId), parsedSuccessfully: true }),
        emailMetadata_model_1.EmailMetadata.countDocuments({ userId: new mongoose_1.Types.ObjectId(userId), parsedSuccessfully: false })
    ]);
    const duplicates = await processedEmail_model_1.ProcessedEmail.countDocuments({
        userId: new mongoose_1.Types.ObjectId(userId)
    });
    return {
        totalProcessed,
        successful,
        failed,
        duplicates
    };
};
exports.getProcessingStats = getProcessingStats;
