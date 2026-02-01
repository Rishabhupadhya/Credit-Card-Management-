"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = exports.getPredictions = exports.getMonthlySummary = exports.deleteRecurringTransaction = exports.updateRecurringTransaction = exports.getRecurringTransactions = exports.createRecurringTransaction = exports.deleteBudget = exports.getBudgets = exports.createOrUpdateBudget = exports.deleteTransaction = exports.updateTransaction = exports.getTransactions = exports.createTransaction = void 0;
const financeService = __importStar(require("./finance.service"));
// Transaction Controllers
const createTransaction = async (req, res, next) => {
    try {
        const transaction = await financeService.createTransaction(req.user.id, req.body);
        res.status(201).json(transaction);
    }
    catch (error) {
        next(error);
    }
};
exports.createTransaction = createTransaction;
const getTransactions = async (req, res, next) => {
    try {
        const { startDate, endDate, type, category, paymentType } = req.query;
        const filters = {};
        if (startDate)
            filters.startDate = new Date(startDate);
        if (endDate)
            filters.endDate = new Date(endDate);
        if (type)
            filters.type = type;
        if (category)
            filters.category = category;
        if (paymentType)
            filters.paymentType = paymentType;
        const transactions = await financeService.getUserTransactions(req.user.id, filters);
        res.json(transactions);
    }
    catch (error) {
        next(error);
    }
};
exports.getTransactions = getTransactions;
const updateTransaction = async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const transaction = await financeService.updateTransaction(transactionId, req.user.id, req.body);
        res.json(transaction);
    }
    catch (error) {
        next(error);
    }
};
exports.updateTransaction = updateTransaction;
const deleteTransaction = async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        await financeService.deleteTransaction(transactionId, req.user.id);
        res.json({ message: "Transaction deleted" });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTransaction = deleteTransaction;
// Budget Controllers
const createOrUpdateBudget = async (req, res, next) => {
    try {
        const { category, monthlyLimit, month } = req.body;
        const budget = await financeService.createOrUpdateBudget(req.user.id, category, monthlyLimit, month);
        res.json(budget);
    }
    catch (error) {
        next(error);
    }
};
exports.createOrUpdateBudget = createOrUpdateBudget;
const getBudgets = async (req, res, next) => {
    try {
        const { month } = req.query;
        const budgets = await financeService.getUserBudgets(req.user.id, month);
        res.json(budgets);
    }
    catch (error) {
        next(error);
    }
};
exports.getBudgets = getBudgets;
const deleteBudget = async (req, res, next) => {
    try {
        const { budgetId } = req.params;
        await financeService.deleteBudget(budgetId, req.user.id);
        res.json({ message: "Budget deleted" });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBudget = deleteBudget;
// Recurring Transaction Controllers
const createRecurringTransaction = async (req, res, next) => {
    try {
        const recurring = await financeService.createRecurringTransaction(req.user.id, req.body);
        res.status(201).json(recurring);
    }
    catch (error) {
        next(error);
    }
};
exports.createRecurringTransaction = createRecurringTransaction;
const getRecurringTransactions = async (req, res, next) => {
    try {
        const recurring = await financeService.getUserRecurringTransactions(req.user.id);
        res.json(recurring);
    }
    catch (error) {
        next(error);
    }
};
exports.getRecurringTransactions = getRecurringTransactions;
const updateRecurringTransaction = async (req, res, next) => {
    try {
        const { recurringId } = req.params;
        const recurring = await financeService.updateRecurringTransaction(recurringId, req.user.id, req.body);
        res.json(recurring);
    }
    catch (error) {
        next(error);
    }
};
exports.updateRecurringTransaction = updateRecurringTransaction;
const deleteRecurringTransaction = async (req, res, next) => {
    try {
        const { recurringId } = req.params;
        await financeService.deleteRecurringTransaction(recurringId, req.user.id);
        res.json({ message: "Recurring transaction deleted" });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteRecurringTransaction = deleteRecurringTransaction;
// Summary and Analytics Controllers
const getMonthlySummary = async (req, res, next) => {
    try {
        const { month } = req.query;
        const summary = await financeService.getMonthlySummary(req.user.id, month);
        res.json(summary);
    }
    catch (error) {
        next(error);
    }
};
exports.getMonthlySummary = getMonthlySummary;
const getPredictions = async (req, res, next) => {
    try {
        const predictions = await financeService.predictNextMonthExpenses(req.user.id);
        res.json(predictions);
    }
    catch (error) {
        next(error);
    }
};
exports.getPredictions = getPredictions;
const getCategories = async (req, res, next) => {
    try {
        const categories = financeService.getCategories();
        res.json(categories);
    }
    catch (error) {
        next(error);
    }
};
exports.getCategories = getCategories;
