"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSpendingSpike = exports.generateCreditAlerts = exports.calculateOverallUtilization = exports.calculateCardUtilization = exports.getDueDate = exports.getBillingPeriod = exports.deleteCreditCard = exports.updateCreditCard = exports.getCreditCardById = exports.getCreditCards = exports.createCreditCard = void 0;
const mongoose_1 = require("mongoose");
const creditCard_model_1 = require("./creditCard.model");
const finance_model_1 = require("./finance.model");
// CRUD Operations
const createCreditCard = async (userId, data) => {
    const card = await creditCard_model_1.CreditCard.create({
        userId: new mongoose_1.Types.ObjectId(userId),
        teamId: data.teamId ? new mongoose_1.Types.ObjectId(data.teamId) : undefined,
        ownerId: new mongoose_1.Types.ObjectId(userId),
        cardName: data.cardName,
        bankName: data.bankName,
        last4Digits: data.last4Digits,
        creditLimit: data.creditLimit,
        outstandingAmount: data.outstandingAmount || 0,
        billingCycleStartDay: data.billingCycleStartDay,
        dueDateDay: data.dueDateDay,
        interestRate: data.interestRate,
        isActive: true
    });
    return card;
};
exports.createCreditCard = createCreditCard;
const getCreditCards = async (userId, teamId) => {
    const query = {
        userId: new mongoose_1.Types.ObjectId(userId),
        isActive: true
    };
    if (teamId) {
        query.teamId = new mongoose_1.Types.ObjectId(teamId);
    }
    return await creditCard_model_1.CreditCard.find(query).sort({ createdAt: -1 });
};
exports.getCreditCards = getCreditCards;
const getCreditCardById = async (cardId, userId) => {
    return await creditCard_model_1.CreditCard.findOne({
        _id: new mongoose_1.Types.ObjectId(cardId),
        userId: new mongoose_1.Types.ObjectId(userId),
        isActive: true
    });
};
exports.getCreditCardById = getCreditCardById;
const updateCreditCard = async (cardId, userId, updates) => {
    return await creditCard_model_1.CreditCard.findOneAndUpdate({ _id: new mongoose_1.Types.ObjectId(cardId), userId: new mongoose_1.Types.ObjectId(userId) }, { $set: updates }, { new: true, runValidators: true });
};
exports.updateCreditCard = updateCreditCard;
const deleteCreditCard = async (cardId, userId) => {
    await creditCard_model_1.CreditCard.findOneAndUpdate({ _id: new mongoose_1.Types.ObjectId(cardId), userId: new mongoose_1.Types.ObjectId(userId) }, { $set: { isActive: false } });
};
exports.deleteCreditCard = deleteCreditCard;
// Billing Cycle Calculations
const getBillingPeriod = (card, referenceDate = new Date()) => {
    const { billingCycleStartDay } = card;
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();
    const refDay = referenceDate.getDate();
    let startYear = refYear;
    let startMonth = refMonth;
    // If reference day is before cycle start, billing period is previous month
    if (refDay < billingCycleStartDay) {
        startMonth -= 1;
        if (startMonth < 0) {
            startMonth = 11;
            startYear -= 1;
        }
    }
    // Handle case where billing day doesn't exist in month (e.g., 31st in Feb)
    const startDay = Math.min(billingCycleStartDay, new Date(startYear, startMonth + 1, 0).getDate());
    const start = new Date(startYear, startMonth, startDay);
    // End is one day before next cycle start
    let endMonth = startMonth + 1;
    let endYear = startYear;
    if (endMonth > 11) {
        endMonth = 0;
        endYear += 1;
    }
    const endDay = Math.min(billingCycleStartDay, new Date(endYear, endMonth + 1, 0).getDate());
    const end = new Date(endYear, endMonth, endDay);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};
exports.getBillingPeriod = getBillingPeriod;
const getDueDate = (card, referenceDate = new Date()) => {
    const { dueDateDay } = card;
    const billingPeriod = (0, exports.getBillingPeriod)(card, referenceDate);
    // Due date is in the month after billing period ends
    const billingEndMonth = billingPeriod.end.getMonth();
    const billingEndYear = billingPeriod.end.getFullYear();
    let dueMonth = billingEndMonth + 1;
    let dueYear = billingEndYear;
    if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
    }
    const dueDay = Math.min(dueDateDay, new Date(dueYear, dueMonth + 1, 0).getDate());
    return new Date(dueYear, dueMonth, dueDay);
};
exports.getDueDate = getDueDate;
// Utilization Calculation
const calculateCardUtilization = async (card, referenceDate = new Date()) => {
    const billingPeriod = (0, exports.getBillingPeriod)(card, referenceDate);
    const dueDate = (0, exports.getDueDate)(card, referenceDate);
    // Get all credit transactions for this card in current billing period
    const transactions = await finance_model_1.Transaction.find({
        creditCardId: card._id,
        paymentType: "credit",
        type: "expense",
        date: { $gte: billingPeriod.start, $lte: billingPeriod.end }
    });
    // Calculate transaction-based spending in current billing period
    const transactionSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
    // Add the stored outstanding amount (existing balance before this billing cycle)
    const outstanding = card.outstandingAmount + transactionSpending;
    const utilizationPercent = card.creditLimit > 0 ? (outstanding / card.creditLimit) * 100 : 0;
    // Determine status based on utilization
    let status;
    if (utilizationPercent < 30)
        status = "healthy";
    else if (utilizationPercent < 50)
        status = "caution";
    else if (utilizationPercent < 70)
        status = "warning";
    else
        status = "critical";
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
        cardId: card._id.toString(),
        cardName: card.cardName,
        bankName: card.bankName,
        last4Digits: card.last4Digits,
        creditLimit: card.creditLimit,
        outstanding,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        status,
        currentBillingPeriod: billingPeriod,
        dueDate,
        daysUntilDue
    };
};
exports.calculateCardUtilization = calculateCardUtilization;
const calculateOverallUtilization = async (userId, teamId, referenceDate = new Date()) => {
    const cards = await (0, exports.getCreditCards)(userId, teamId);
    const activeCards = cards.filter(c => c.isActive);
    const cardUtilizations = await Promise.all(activeCards.map(card => (0, exports.calculateCardUtilization)(card, referenceDate)));
    const totalCreditLimit = cardUtilizations.reduce((sum, c) => sum + c.creditLimit, 0);
    const totalOutstanding = cardUtilizations.reduce((sum, c) => sum + c.outstanding, 0);
    const overallUtilization = totalCreditLimit > 0
        ? Math.round((totalOutstanding / totalCreditLimit) * 1000) / 10
        : 0;
    let overallStatus;
    if (overallUtilization < 30)
        overallStatus = "healthy";
    else if (overallUtilization < 50)
        overallStatus = "caution";
    else if (overallUtilization < 70)
        overallStatus = "warning";
    else
        overallStatus = "critical";
    return {
        totalCreditLimit,
        totalOutstanding,
        overallUtilization,
        overallStatus,
        cardCount: cards.length,
        activeCardCount: activeCards.length,
        cards: cardUtilizations
    };
};
exports.calculateOverallUtilization = calculateOverallUtilization;
// Alert Generation
const generateCreditAlerts = async (userId, teamId) => {
    const overview = await (0, exports.calculateOverallUtilization)(userId, teamId);
    const alerts = [];
    overview.cards.forEach(card => {
        // High utilization alert
        if (card.utilizationPercent >= 70) {
            alerts.push({
                id: `HIGH_UTIL_${card.cardId}`,
                type: "HIGH_UTILIZATION",
                severity: "critical",
                message: `${card.cardName} (${card.last4Digits}) is at ${card.utilizationPercent}% utilization. Consider reducing usage.`,
                cardId: card.cardId,
                cardName: card.cardName,
                timestamp: new Date()
            });
        }
        else if (card.utilizationPercent >= 50) {
            alerts.push({
                id: `HIGH_UTIL_${card.cardId}`,
                type: "HIGH_UTILIZATION",
                severity: "warning",
                message: `${card.cardName} (${card.last4Digits}) is at ${card.utilizationPercent}% utilization. Approaching high usage.`,
                cardId: card.cardId,
                cardName: card.cardName,
                timestamp: new Date()
            });
        }
        // Near credit limit alert
        const remaining = card.creditLimit - card.outstanding;
        if (remaining < card.creditLimit * 0.1 && card.utilizationPercent > 0) {
            alerts.push({
                id: `NEAR_LIMIT_${card.cardId}`,
                type: "NEAR_LIMIT",
                severity: "critical",
                message: `${card.cardName} (${card.last4Digits}) has only ₹${remaining.toLocaleString()} remaining.`,
                cardId: card.cardId,
                cardName: card.cardName,
                timestamp: new Date()
            });
        }
        // Due date approaching
        if (card.daysUntilDue <= 7 && card.outstanding > 0) {
            const severity = card.daysUntilDue <= 3 ? "critical" : "warning";
            alerts.push({
                id: `DUE_DATE_${card.cardId}`,
                type: "DUE_DATE_APPROACHING",
                severity,
                message: `Payment due in ${card.daysUntilDue} days for ${card.cardName} (${card.last4Digits}). Outstanding: ₹${card.outstanding.toLocaleString()}`,
                cardId: card.cardId,
                cardName: card.cardName,
                timestamp: new Date()
            });
        }
    });
    // Sort by severity (critical first)
    return alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });
};
exports.generateCreditAlerts = generateCreditAlerts;
// Spending spike detection (compare last 7 days vs previous 7 days)
const detectSpendingSpike = async (cardId, userId) => {
    const card = await (0, exports.getCreditCardById)(cardId, userId);
    if (!card)
        return null;
    const now = new Date();
    const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev7DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const [last7Days, prev7Days] = await Promise.all([
        finance_model_1.Transaction.find({
            creditCardId: card._id,
            paymentType: "credit",
            type: "expense",
            date: { $gte: last7DaysStart, $lte: now }
        }),
        finance_model_1.Transaction.find({
            creditCardId: card._id,
            paymentType: "credit",
            type: "expense",
            date: { $gte: prev7DaysStart, $lt: last7DaysStart }
        })
    ]);
    const recentSpend = last7Days.reduce((sum, t) => sum + t.amount, 0);
    const previousSpend = prev7Days.reduce((sum, t) => sum + t.amount, 0);
    // Alert if spending increased by 50% or more
    if (previousSpend > 0 && recentSpend / previousSpend >= 1.5) {
        const increasePercent = Math.round(((recentSpend - previousSpend) / previousSpend) * 100);
        return {
            id: `SPIKE_${cardId}`,
            type: "SPENDING_SPIKE",
            severity: "warning",
            message: `Spending on ${card.cardName} increased by ${increasePercent}% in the last 7 days.`,
            cardId: card._id.toString(),
            cardName: card.cardName,
            timestamp: new Date()
        };
    }
    return null;
};
exports.detectSpendingSpike = detectSpendingSpike;
