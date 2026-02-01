"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = exports.predictNextMonthExpenses = exports.getMonthlySummary = exports.processRecurringTransactions = exports.deleteRecurringTransaction = exports.updateRecurringTransaction = exports.getUserRecurringTransactions = exports.createRecurringTransaction = exports.deleteBudget = exports.getUserBudgets = exports.createOrUpdateBudget = exports.deleteTransaction = exports.updateTransaction = exports.getUserTransactions = exports.createTransaction = void 0;
const finance_model_1 = require("./finance.model");
const auth_model_1 = require("../auth.model");
const mongoose_1 = require("mongoose");
// Transaction Services
const createTransaction = async (userId, data) => {
    const user = await auth_model_1.User.findById(userId);
    if (!user)
        throw new Error("User not found");
    const transactionData = {
        userId: new mongoose_1.Types.ObjectId(userId),
        type: data.type,
        amount: data.amount,
        category: data.category,
        description: data.description || "",
        date: data.date ? new Date(data.date) : new Date(),
        isRecurring: data.isRecurring || false
    };
    if (data.recurringId) {
        transactionData.recurringId = new mongoose_1.Types.ObjectId(data.recurringId);
    }
    const transaction = await finance_model_1.Transaction.create(transactionData);
    // Update budget spent amount
    if (data.type === "expense") {
        await updateBudgetSpent(userId, data.category, data.amount, data.date ? new Date(data.date) : new Date());
    }
    return transaction;
};
exports.createTransaction = createTransaction;
const getUserTransactions = async (userId, filters) => {
    const user = await auth_model_1.User.findById(userId);
    if (!user)
        throw new Error("User not found");
    const query = { userId };
    if (filters?.startDate || filters?.endDate) {
        query.date = {};
        if (filters.startDate)
            query.date.$gte = filters.startDate;
        if (filters.endDate)
            query.date.$lte = filters.endDate;
    }
    if (filters?.type)
        query.type = filters.type;
    if (filters?.category)
        query.category = filters.category;
    if (filters?.paymentType)
        query.paymentType = filters.paymentType;
    return finance_model_1.Transaction.find(query).sort({ date: -1 }).populate('creditCardId');
};
exports.getUserTransactions = getUserTransactions;
const updateTransaction = async (transactionId, userId, updates) => {
    const transaction = await finance_model_1.Transaction.findOne({ _id: transactionId, userId });
    if (!transaction)
        throw new Error("Transaction not found");
    const oldAmount = transaction.amount;
    const oldCategory = transaction.category;
    Object.assign(transaction, updates);
    await transaction.save();
    // Update budget if expense category or amount changed
    if (transaction.type === "expense" && (updates.amount || updates.category)) {
        // Revert old budget
        await updateBudgetSpent(userId, oldCategory, -oldAmount, transaction.date);
        // Apply new budget
        await updateBudgetSpent(userId, transaction.category, transaction.amount, transaction.date);
    }
    return transaction;
};
exports.updateTransaction = updateTransaction;
const deleteTransaction = async (transactionId, userId) => {
    const transaction = await finance_model_1.Transaction.findOne({ _id: transactionId, userId });
    if (!transaction)
        throw new Error("Transaction not found");
    // Revert budget
    if (transaction.type === "expense") {
        await updateBudgetSpent(userId, transaction.category, -transaction.amount, transaction.date);
    }
    await finance_model_1.Transaction.findByIdAndDelete(transactionId);
};
exports.deleteTransaction = deleteTransaction;
// Budget Services
const createOrUpdateBudget = async (userId, category, monthlyLimit, month) => {
    const user = await auth_model_1.User.findById(userId);
    if (!user)
        throw new Error("User not found");
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const budgetData = {
        userId: new mongoose_1.Types.ObjectId(userId),
        category,
        monthlyLimit,
        month: targetMonth
    };
    if (user.activeTeamId) {
        budgetData.teamId = user.activeTeamId;
    }
    const budget = await finance_model_1.Budget.findOneAndUpdate({ userId, category, month: targetMonth }, { $set: budgetData }, { upsert: true, new: true });
    // Recalculate spent
    const monthStart = new Date(targetMonth + "-01");
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const transactions = await finance_model_1.Transaction.find({
        userId,
        type: "expense",
        category,
        date: { $gte: monthStart, $lt: monthEnd }
    });
    budget.spent = transactions.reduce((sum, t) => sum + t.amount, 0);
    await budget.save();
    return budget;
};
exports.createOrUpdateBudget = createOrUpdateBudget;
const getUserBudgets = async (userId, month) => {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return finance_model_1.Budget.find({ userId, month: targetMonth });
};
exports.getUserBudgets = getUserBudgets;
const updateBudgetSpent = async (userId, category, amount, date) => {
    const month = date.toISOString().slice(0, 7);
    const budget = await finance_model_1.Budget.findOne({ userId, category, month });
    if (budget) {
        budget.spent += amount;
        await budget.save();
    }
};
const deleteBudget = async (budgetId, userId) => {
    await finance_model_1.Budget.findOneAndDelete({ _id: budgetId, userId });
};
exports.deleteBudget = deleteBudget;
// Recurring Transaction Services
const createRecurringTransaction = async (userId, data) => {
    const user = await auth_model_1.User.findById(userId);
    if (!user)
        throw new Error("User not found");
    const recurringData = {
        userId: new mongoose_1.Types.ObjectId(userId),
        ...data
    };
    return finance_model_1.RecurringTransaction.create(recurringData);
};
exports.createRecurringTransaction = createRecurringTransaction;
const getUserRecurringTransactions = async (userId) => {
    return finance_model_1.RecurringTransaction.find({ userId, isActive: true }).sort({ createdAt: -1 });
};
exports.getUserRecurringTransactions = getUserRecurringTransactions;
const updateRecurringTransaction = async (recurringId, userId, updates) => {
    return finance_model_1.RecurringTransaction.findOneAndUpdate({ _id: recurringId, userId }, { $set: updates }, { new: true });
};
exports.updateRecurringTransaction = updateRecurringTransaction;
const deleteRecurringTransaction = async (recurringId, userId) => {
    await finance_model_1.RecurringTransaction.findOneAndUpdate({ _id: recurringId, userId }, { $set: { isActive: false } });
};
exports.deleteRecurringTransaction = deleteRecurringTransaction;
const processRecurringTransactions = async () => {
    const now = new Date();
    const recurring = await finance_model_1.RecurringTransaction.find({ isActive: true });
    for (const r of recurring) {
        const shouldProcess = checkIfDue(r, now);
        if (shouldProcess) {
            await (0, exports.createTransaction)(r.userId.toString(), {
                type: r.type,
                amount: r.amount,
                category: r.category,
                description: r.description + " (Recurring)",
                date: now,
                isRecurring: true,
                recurringId: r._id.toString()
            });
            r.lastProcessed = now;
            await r.save();
        }
    }
};
exports.processRecurringTransactions = processRecurringTransactions;
const checkIfDue = (recurring, now) => {
    if (!recurring.lastProcessed)
        return true;
    const lastProcessed = new Date(recurring.lastProcessed);
    const daysSince = (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24);
    switch (recurring.frequency) {
        case "daily":
            return daysSince >= 1;
        case "weekly":
            return daysSince >= 7 && now.getDay() === recurring.dayOfWeek;
        case "monthly":
            return now.getDate() === recurring.dayOfMonth && now.getMonth() !== lastProcessed.getMonth();
        case "yearly":
            return now.getMonth() === lastProcessed.getMonth() &&
                now.getDate() === recurring.dayOfMonth &&
                now.getFullYear() > lastProcessed.getFullYear();
        default:
            return false;
    }
};
// Monthly Summary
const getMonthlySummary = async (userId, month) => {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const monthStart = new Date(targetMonth + "-01");
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const transactions = await finance_model_1.Transaction.find({
        userId,
        date: { $gte: monthStart, $lt: monthEnd }
    });
    const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    // Category breakdown
    const categoryBreakdown = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
    });
    const highestCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0];
    // Compare with last month
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(lastMonthStart);
    lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
    const lastMonthTransactions = await finance_model_1.Transaction.find({
        userId,
        date: { $gte: lastMonthStart, $lt: lastMonthEnd }
    });
    const lastMonthExpenses = lastMonthTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
    const expenseChange = lastMonthExpenses > 0
        ? ((expenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : 0;
    return {
        month: targetMonth,
        income,
        expenses,
        savings,
        savingsRate,
        categoryBreakdown,
        highestCategory: highestCategory ? { category: highestCategory[0], amount: highestCategory[1] } : null,
        comparison: {
            lastMonthExpenses,
            expenseChange
        }
    };
};
exports.getMonthlySummary = getMonthlySummary;
// Expense Prediction (Simple Moving Average)
const predictNextMonthExpenses = async (userId) => {
    const now = new Date();
    const months = [];
    for (let i = 0; i < 3; i++) {
        const month = new Date(now);
        month.setMonth(month.getMonth() - i);
        months.push(month.toISOString().slice(0, 7));
    }
    const predictions = {};
    for (const month of months) {
        const summary = await (0, exports.getMonthlySummary)(userId, month);
        Object.entries(summary.categoryBreakdown).forEach(([category, amount]) => {
            if (!predictions[category])
                predictions[category] = [];
            predictions[category].push(amount);
        });
    }
    const predicted = {};
    Object.entries(predictions).forEach(([category, amounts]) => {
        predicted[category] = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    });
    const totalPredicted = Object.values(predicted).reduce((sum, amt) => sum + amt, 0);
    return {
        predictions: predicted,
        total: totalPredicted
    };
};
exports.predictNextMonthExpenses = predictNextMonthExpenses;
const getCategories = () => finance_model_1.DEFAULT_CATEGORIES;
exports.getCategories = getCategories;
