"use strict";
/**
 * Spending Behavior Profiling Service
 *
 * Analyzes historical transaction data to build behavioral profiles.
 * Identifies patterns in:
 * - Temporal spending (daily, weekly, monthly)
 * - Category preferences (merchant-based heuristics)
 * - Peak spending periods
 * - Spending volatility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSpendingProfiles = exports.generateSpendingProfile = exports.categorizeMerchant = void 0;
const mongoose_1 = require("mongoose");
const finance_model_1 = require("../finance.model");
const logger_1 = require("../../../../utils/logger");
/**
 * Categorize merchant using simple heuristic rules
 *
 * In production, this would be replaced with:
 * - ML-based classification
 * - External merchant category database (MCC codes)
 * - User-defined categories
 */
const categorizeMerchant = (merchantName) => {
    const merchant = merchantName.toUpperCase();
    // Food & Dining
    if (/SWIGGY|ZOMATO|UBER.*EATS|MCDONALD|KFC|DOMINO|PIZZA|RESTAURANT|CAFE|FOOD|DINE/.test(merchant)) {
        return "Food & Dining";
    }
    // Shopping
    if (/AMAZON|FLIPKART|MYNTRA|AJIO|MEESHO|SHOPPING|MALL|STORE/.test(merchant)) {
        return "Shopping";
    }
    // Entertainment
    if (/NETFLIX|PRIME.*VIDEO|HOTSTAR|SPOTIFY|BOOKMYSHOW|MOVIE|CINEMA|GAMING/.test(merchant)) {
        return "Entertainment";
    }
    // Travel & Transport
    if (/UBER|OLA|RAPIDO|MAKEMYTRIP|GOIBIBO|CLEARTRIP|IRCTC|FLIGHT|HOTEL|TRAVEL/.test(merchant)) {
        return "Travel & Transport";
    }
    // Groceries
    if (/BIGBASKET|GROFERS|BLINKIT|ZEPTO|DUNZO|GROCERY|SUPERMARKET/.test(merchant)) {
        return "Groceries";
    }
    // Bills & Utilities
    if (/ELECTRICITY|WATER|GAS|MOBILE|RECHARGE|BILL|UTILITY/.test(merchant)) {
        return "Bills & Utilities";
    }
    // Health & Wellness
    if (/PHARMA|MEDICAL|DOCTOR|HOSPITAL|CLINIC|HEALTH|GYM|FITNESS/.test(merchant)) {
        return "Health & Wellness";
    }
    return "Others";
};
exports.categorizeMerchant = categorizeMerchant;
/**
 * Calculate standard deviation
 */
const calculateStdDev = (values) => {
    if (values.length === 0)
        return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
};
/**
 * Generate spending profile for a credit card
 *
 * @param userId User ID
 * @param creditCardId Credit card ID
 * @param lookbackMonths Number of months to analyze (default: 6)
 * @returns Spending profile with behavioral patterns
 */
const generateSpendingProfile = async (userId, creditCardId, lookbackMonths = 6) => {
    logger_1.logger.info(`Generating spending profile for card ${creditCardId}`);
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - lookbackMonths);
    // Fetch all transactions for this card in the period
    const transactions = await finance_model_1.Transaction.find({
        userId: new mongoose_1.Types.ObjectId(userId),
        creditCardId: new mongoose_1.Types.ObjectId(creditCardId),
        type: "expense",
        paymentType: "credit",
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    if (transactions.length === 0) {
        logger_1.logger.warn(`No transactions found for card ${creditCardId}`);
        // Return empty profile
        return {
            creditCardId,
            userId,
            averageMonthlySpend: 0,
            averageDailySpend: 0,
            averageWeeklySpend: 0,
            peakSpendingDays: [],
            peakSpendingDayOfWeek: 0,
            categoryBreakdown: [],
            standardDeviationDaily: 0,
            coefficientOfVariation: 0,
            dataPoints: 0,
            periodCovered: {
                startDate,
                endDate,
                monthsCovered: lookbackMonths
            },
            lastUpdated: new Date()
        };
    }
    // === TEMPORAL ANALYSIS ===
    // Total spend
    const totalSpend = transactions.reduce((sum, t) => sum + t.amount, 0);
    // Calculate actual months covered
    const actualStartDate = transactions[0].date;
    const actualEndDate = transactions[transactions.length - 1].date;
    const daysCovered = Math.max(1, Math.ceil((actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    const monthsCovered = daysCovered / 30.44; // Average days per month
    // Averages
    const averageMonthlySpend = totalSpend / Math.max(1, monthsCovered);
    const averageDailySpend = totalSpend / daysCovered;
    const averageWeeklySpend = averageDailySpend * 7;
    // === PEAK SPENDING ANALYSIS ===
    // Group by day of month
    const spendByDayOfMonth = {};
    const spendByDayOfWeek = {};
    transactions.forEach(t => {
        const dayOfMonth = new Date(t.date).getDate();
        const dayOfWeek = new Date(t.date).getDay();
        spendByDayOfMonth[dayOfMonth] = (spendByDayOfMonth[dayOfMonth] || 0) + t.amount;
        spendByDayOfWeek[dayOfWeek] = (spendByDayOfWeek[dayOfWeek] || 0) + t.amount;
    });
    // Find top 3 peak spending days
    const peakSpendingDays = Object.entries(spendByDayOfMonth)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([day]) => parseInt(day));
    // Find peak day of week
    const peakSpendingDayOfWeek = parseInt(Object.entries(spendByDayOfWeek)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || "0");
    // === CATEGORY ANALYSIS ===
    const categoryMap = {};
    transactions.forEach(t => {
        // Extract merchant from description (format: "merchant - payment - details")
        const merchantName = t.description?.split(" - ")[0] || "Unknown";
        const category = (0, exports.categorizeMerchant)(merchantName);
        if (!categoryMap[category]) {
            categoryMap[category] = { totalSpent: 0, transactionCount: 0 };
        }
        categoryMap[category].totalSpent += t.amount;
        categoryMap[category].transactionCount += 1;
    });
    const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
        category,
        totalSpent: data.totalSpent,
        transactionCount: data.transactionCount,
        percentageOfTotal: (data.totalSpent / totalSpend) * 100
    })).sort((a, b) => b.totalSpent - a.totalSpent);
    // === VOLATILITY ANALYSIS ===
    // Group by day and calculate daily spend variance
    const dailySpends = {};
    transactions.forEach(t => {
        const dateKey = new Date(t.date).toISOString().split("T")[0];
        dailySpends[dateKey] = (dailySpends[dateKey] || 0) + t.amount;
    });
    const dailySpendValues = Object.values(dailySpends);
    const standardDeviationDaily = calculateStdDev(dailySpendValues);
    const coefficientOfVariation = averageDailySpend > 0
        ? standardDeviationDaily / averageDailySpend
        : 0;
    const profile = {
        creditCardId,
        userId,
        averageMonthlySpend: Math.round(averageMonthlySpend * 100) / 100,
        averageDailySpend: Math.round(averageDailySpend * 100) / 100,
        averageWeeklySpend: Math.round(averageWeeklySpend * 100) / 100,
        peakSpendingDays,
        peakSpendingDayOfWeek,
        categoryBreakdown,
        standardDeviationDaily: Math.round(standardDeviationDaily * 100) / 100,
        coefficientOfVariation: Math.round(coefficientOfVariation * 1000) / 1000,
        dataPoints: transactions.length,
        periodCovered: {
            startDate: actualStartDate,
            endDate: actualEndDate,
            monthsCovered: Math.round(monthsCovered * 10) / 10
        },
        lastUpdated: new Date()
    };
    logger_1.logger.info(`Profile generated: ${transactions.length} transactions, avg monthly: ₹${profile.averageMonthlySpend}`);
    return profile;
};
exports.generateSpendingProfile = generateSpendingProfile;
/**
 * Get spending profile for multiple cards
 */
const generateSpendingProfiles = async (userId, creditCardIds, lookbackMonths = 6) => {
    return Promise.all(creditCardIds.map(cardId => (0, exports.generateSpendingProfile)(userId, cardId, lookbackMonths)));
};
exports.generateSpendingProfiles = generateSpendingProfiles;
