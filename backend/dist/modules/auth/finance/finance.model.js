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
exports.DEFAULT_CATEGORIES = exports.RecurringTransaction = exports.Budget = exports.Transaction = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TransactionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Team" },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    paymentType: {
        type: String,
        enum: ["cash", "debit", "credit"],
        default: "cash"
    },
    creditCardId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "CreditCard",
        validate: {
            validator: function (value) {
                // creditCardId required only if paymentType is credit
                if (this.paymentType === "credit" && !value)
                    return false;
                return true;
            },
            message: "creditCardId is required when paymentType is credit"
        }
    },
    isRecurring: { type: Boolean, default: false },
    recurringId: { type: mongoose_1.Schema.Types.ObjectId, ref: "RecurringTransaction" }
}, { timestamps: true });
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ teamId: 1, date: -1 });
TransactionSchema.index({ creditCardId: 1, date: -1 });
exports.Transaction = mongoose_1.default.model("Transaction", TransactionSchema);
const BudgetSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Team" },
    category: { type: String, required: true },
    monthlyLimit: { type: Number, required: true },
    month: { type: String, required: true },
    spent: { type: Number, default: 0 }
}, { timestamps: true });
BudgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });
exports.Budget = mongoose_1.default.model("Budget", BudgetSchema);
const RecurringTransactionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Team" },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, default: "" },
    frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly"], required: true },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    lastProcessed: { type: Date }
}, { timestamps: true });
exports.RecurringTransaction = mongoose_1.default.model("RecurringTransaction", RecurringTransactionSchema);
// Default Categories
exports.DEFAULT_CATEGORIES = {
    expense: ["Food", "Travel", "Rent", "Utilities", "Shopping", "Entertainment", "Health", "Education", "Other"],
    income: ["Salary", "Freelance", "Investment", "Gift", "Other"]
};
