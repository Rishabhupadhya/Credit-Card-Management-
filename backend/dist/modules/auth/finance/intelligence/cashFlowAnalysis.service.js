"use strict";
/**
 * MODULE 3: Cash Flow Feasibility Check
 *
 * Analyzes whether user's income can cover upcoming credit card payments
 * and identifies shortfalls.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const creditCard_model_1 = require("../creditCard.model");
class CashFlowAnalysisService {
    /**
     * Analyze cash flow feasibility for upcoming payments
     */
    async analyzeCashFlow(userId, monthlyIncome, fixedExpenses, variableExpenses) {
        // Calculate available cash
        const totalExpenses = fixedExpenses + variableExpenses;
        const availableCash = monthlyIncome - totalExpenses;
        // Fetch all active credit cards
        const cards = await creditCard_model_1.CreditCard.find({
            userId: new mongoose_1.Types.ObjectId(userId),
            isActive: true
        });
        console.log(`[CashFlow] Found ${cards.length} active cards for user ${userId}`);
        if (cards.length === 0) {
            return {
                userId,
                monthlyIncome,
                fixedExpenses,
                variableExpenses,
                totalExpenses,
                availableCash,
                requiredPayments: [],
                totalRequiredPayments: 0,
                isFeasible: true,
                shortfallAmount: 0,
                cardsAtRisk: [],
                generatedAt: new Date()
            };
        }
        // Calculate required payments (minimum due per card)
        const requiredPayments = cards.map((card) => {
            const minimumDue = this.calculateMinimumDue(card.outstandingAmount);
            const dueDate = this.calculateDueDate(card.dueDateDay);
            return {
                creditCardId: card._id.toString(),
                cardName: card.cardName,
                minimumDue,
                dueDate
            };
        });
        // Sort by due date (earliest first)
        requiredPayments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        // Calculate total required
        const totalRequiredPayments = requiredPayments.reduce((sum, payment) => sum + payment.minimumDue, 0);
        // Check feasibility
        const isFeasible = availableCash >= totalRequiredPayments;
        const shortfallAmount = isFeasible ? 0 : totalRequiredPayments - availableCash;
        // Identify cards at risk (if shortfall exists)
        const cardsAtRisk = [];
        if (!isFeasible) {
            let cumulativePayment = 0;
            for (const payment of requiredPayments) {
                cumulativePayment += payment.minimumDue;
                if (cumulativePayment > availableCash) {
                    cardsAtRisk.push(payment.cardName);
                }
            }
        }
        const earliestPaymentDate = requiredPayments.length > 0
            ? requiredPayments[0].dueDate
            : undefined;
        return {
            userId,
            monthlyIncome,
            fixedExpenses,
            variableExpenses,
            totalExpenses,
            availableCash,
            requiredPayments,
            totalRequiredPayments,
            isFeasible,
            shortfallAmount,
            earliestPaymentDate,
            cardsAtRisk,
            generatedAt: new Date()
        };
    }
    /**
     * Calculate minimum due (typically 5% of outstanding or ₹100, whichever is higher)
     */
    calculateMinimumDue(outstandingAmount) {
        return Math.max(outstandingAmount * 0.05, 100);
    }
    /**
     * Calculate next due date based on due date day
     */
    calculateDueDate(dueDateDay) {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        let dueDate = new Date(currentYear, currentMonth, dueDateDay);
        // If due date has passed this month, use next month
        if (dueDateDay < currentDay) {
            dueDate.setMonth(currentMonth + 1);
        }
        return dueDate;
    }
    /**
     * Generate human-readable summary of cash flow status
     */
    generateCashFlowSummary(analysis) {
        if (analysis.isFeasible) {
            const surplus = analysis.availableCash - analysis.totalRequiredPayments;
            return `✅ Cash flow is sufficient. You have ₹${surplus.toFixed(0)} surplus after covering all minimum dues.`;
        }
        const earliestDate = analysis.earliestPaymentDate
            ? analysis.earliestPaymentDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short"
            })
            : "soon";
        return `⚠️ You need an additional ₹${analysis.shortfallAmount.toFixed(0)} by ${earliestDate} to avoid missing minimum dues. ${analysis.cardsAtRisk.length} card(s) at risk: ${analysis.cardsAtRisk.join(", ")}.`;
    }
    /**
     * Suggest expense reductions to meet shortfall
     */
    suggestExpenseReductions(analysis, targetReduction) {
        const suggestions = [];
        // Suggest reducing variable expenses first (easier to control)
        if (analysis.variableExpenses > 0) {
            const variableReduction = Math.min(targetReduction, analysis.variableExpenses * 0.3 // Max 30% reduction
            );
            suggestions.push({
                category: "Variable Expenses",
                currentAmount: analysis.variableExpenses,
                suggestedReduction: variableReduction,
                newAmount: analysis.variableExpenses - variableReduction
            });
            targetReduction -= variableReduction;
        }
        // If still short, suggest fixed expense review
        if (targetReduction > 0 && analysis.fixedExpenses > 0) {
            const fixedReduction = Math.min(targetReduction, analysis.fixedExpenses * 0.15 // Max 15% reduction (harder to change)
            );
            suggestions.push({
                category: "Fixed Expenses",
                currentAmount: analysis.fixedExpenses,
                suggestedReduction: fixedReduction,
                newAmount: analysis.fixedExpenses - fixedReduction
            });
        }
        return suggestions;
    }
}
exports.default = new CashFlowAnalysisService();
