"use strict";
/**
 * Monthly Spending Tracker Service
 *
 * Tracks and updates monthly spending for credit cards.
 * Automatically handles month rollovers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMonthlySpending = exports.checkMonthlyLimit = exports.getUserMonthlySpending = exports.getMonthlySpending = exports.addTransactionToMonthly = exports.getOrCreateMonthlySpending = exports.getCurrentMonth = void 0;
const mongoose_1 = require("mongoose");
const monthlySpending_model_1 = require("./monthlySpending.model");
const logger_1 = require("../../../../utils/logger");
/**
 * Get current month string in YYYY-MM format
 */
const getCurrentMonth = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};
exports.getCurrentMonth = getCurrentMonth;
/**
 * Get or create monthly spending record for a card
 */
const getOrCreateMonthlySpending = async (userId, creditCardId, month = (0, exports.getCurrentMonth)()) => {
    let spending = await monthlySpending_model_1.MonthlySpending.findOne({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        month
    });
    if (!spending) {
        spending = await monthlySpending_model_1.MonthlySpending.create({
            userId: new mongoose_1.Types.ObjectId(userId),
            creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
            month,
            totalSpent: 0,
            transactionCount: 0,
            lastUpdated: new Date()
        });
        logger_1.logger.info(`Created new monthly spending record for card ${creditCardId}, month ${month}`);
    }
    return spending;
};
exports.getOrCreateMonthlySpending = getOrCreateMonthlySpending;
/**
 * Add transaction amount to monthly spending
 *
 * @param userId User ID
 * @param creditCardId Credit card ID
 * @param amount Transaction amount
 * @param transactionDate Transaction date (defaults to now)
 * @returns Updated monthly spending record
 */
const addTransactionToMonthly = async (userId, creditCardId, amount, transactionDate = new Date()) => {
    const month = (0, exports.getCurrentMonth)(transactionDate);
    const spending = await (0, exports.getOrCreateMonthlySpending)(userId, creditCardId, month);
    spending.totalSpent += amount;
    spending.transactionCount += 1;
    spending.lastUpdated = new Date();
    await spending.save();
    logger_1.logger.info(`Updated monthly spending for card ${creditCardId}: +₹${amount}, total: ₹${spending.totalSpent}`);
    return spending;
};
exports.addTransactionToMonthly = addTransactionToMonthly;
/**
 * Get monthly spending for a specific card and month
 */
const getMonthlySpending = async (userId, creditCardId, month = (0, exports.getCurrentMonth)()) => {
    return await monthlySpending_model_1.MonthlySpending.findOne({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        month
    });
};
exports.getMonthlySpending = getMonthlySpending;
/**
 * Get all monthly spending records for a user (optionally filtered by month)
 */
const getUserMonthlySpending = async (userId, month) => {
    const query = { userId: new mongoose_1.Types.ObjectId(userId) };
    if (month) {
        query.month = month;
    }
    return await monthlySpending_model_1.MonthlySpending.find(query)
        .populate("creditCardId")
        .sort({ month: -1, totalSpent: -1 });
};
exports.getUserMonthlySpending = getUserMonthlySpending;
const checkMonthlyLimit = async (userId, creditCardId, monthlyLimit, month = (0, exports.getCurrentMonth)()) => {
    const spending = await (0, exports.getMonthlySpending)(userId, creditCardId, month);
    const currentSpent = spending?.totalSpent || 0;
    const isBreached = currentSpent >= monthlyLimit;
    const percentageUsed = monthlyLimit > 0 ? (currentSpent / monthlyLimit) * 100 : 0;
    const amountOver = Math.max(0, currentSpent - monthlyLimit);
    return {
        isBreached,
        currentSpent,
        monthlyLimit,
        percentageUsed: Math.round(percentageUsed * 10) / 10,
        amountOver
    };
};
exports.checkMonthlyLimit = checkMonthlyLimit;
/**
 * Reset monthly spending (typically not needed as new month creates new record)
 * Useful for testing or manual resets
 */
const resetMonthlySpending = async (userId, creditCardId, month = (0, exports.getCurrentMonth)()) => {
    await monthlySpending_model_1.MonthlySpending.findOneAndUpdate({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        month
    }, {
        totalSpent: 0,
        transactionCount: 0,
        lastUpdated: new Date()
    });
    logger_1.logger.info(`Reset monthly spending for card ${creditCardId}, month ${month}`);
};
exports.resetMonthlySpending = resetMonthlySpending;
