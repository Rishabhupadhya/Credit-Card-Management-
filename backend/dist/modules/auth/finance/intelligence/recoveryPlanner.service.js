"use strict";
/**
 * MODULE 4: What-If & Recovery Suggestions
 *
 * Provides actionable recovery strategies when cash shortfall exists.
 * NO LOANS — Focus on payment optimization and expense management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class RecoveryPlannerService {
    /**
     * Generate recovery plan when shortfall exists
     */
    async generateRecoveryPlan(cashFlowAnalysis) {
        const { shortfallAmount, requiredPayments, userId } = cashFlowAnalysis;
        if (shortfallAmount === 0) {
            return {
                userId,
                shortfallAmount: 0,
                suggestions: [
                    {
                        type: "income_awareness",
                        description: "Your cash flow is healthy. Continue maintaining on-time payments.",
                        impact: "Credit score remains protected",
                        priority: 1
                    }
                ],
                scenarios: [],
                generatedAt: new Date()
            };
        }
        // Generate recovery suggestions in priority order
        const suggestions = [];
        let priority = 1;
        // SUGGESTION 1: Pay minimum dues only (highest priority for credit score)
        const minimumOnlySuggestion = this.suggestMinimumPaymentsOnly(requiredPayments, cashFlowAnalysis.availableCash, priority++);
        suggestions.push(minimumOnlySuggestion);
        // SUGGESTION 2: Partial payments (if even minimums can't be covered)
        if (cashFlowAnalysis.availableCash < cashFlowAnalysis.totalRequiredPayments) {
            const partialSuggestion = this.suggestPartialPayments(requiredPayments, cashFlowAnalysis.availableCash, priority++);
            suggestions.push(partialSuggestion);
        }
        // SUGGESTION 3: Expense reduction targets
        const expenseReductionSuggestion = this.suggestExpenseReduction(shortfallAmount, cashFlowAnalysis, priority++);
        suggestions.push(expenseReductionSuggestion);
        // SUGGESTION 4: Income awareness (identify income gap)
        const incomeAwarenessSuggestion = this.suggestIncomeAwareness(shortfallAmount, cashFlowAnalysis.monthlyIncome, priority++);
        suggestions.push(incomeAwarenessSuggestion);
        // Generate scenario comparisons
        const scenarios = this.generateScenarios(cashFlowAnalysis);
        return {
            userId,
            shortfallAmount,
            suggestions,
            scenarios,
            generatedAt: new Date()
        };
    }
    /**
     * SUGGESTION 1: Pay minimum dues only
     */
    suggestMinimumPaymentsOnly(requiredPayments, availableCash, priority) {
        const totalMinimums = requiredPayments.reduce((sum, p) => sum + p.minimumDue, 0);
        const cardsAffected = requiredPayments.map((p) => p.cardName);
        return {
            type: "minimum_only",
            description: `Pay only minimum dues on all ${requiredPayments.length} card(s) to protect credit score`,
            impact: `Reduces immediate cash need to ₹${totalMinimums.toFixed(0)}. Credit score remains protected. Interest will accrue on remaining balance.`,
            amountInvolved: totalMinimums,
            cardsAffected,
            priority
        };
    }
    /**
     * SUGGESTION 2: Partial payments strategy
     */
    suggestPartialPayments(requiredPayments, availableCash, priority) {
        // Sort by priority (cards with earliest due dates first)
        const sortedPayments = [...requiredPayments].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        // Allocate available cash to highest priority cards first
        let remainingCash = availableCash;
        const paidCards = [];
        const unpaidCards = [];
        for (const payment of sortedPayments) {
            if (remainingCash >= payment.minimumDue) {
                paidCards.push(payment.cardName);
                remainingCash -= payment.minimumDue;
            }
            else {
                unpaidCards.push(payment.cardName);
            }
        }
        return {
            type: "partial_payment",
            description: `Pay ${paidCards.length} card(s) with earliest due dates first, defer ${unpaidCards.length} card(s)`,
            impact: `Prioritizes cards at highest risk. ${paidCards.length} card(s) protected: ${paidCards.join(", ")}. ${unpaidCards.length} card(s) will incur late fees: ${unpaidCards.join(", ")}.`,
            amountInvolved: availableCash,
            cardsAffected: [...paidCards, ...unpaidCards],
            priority
        };
    }
    /**
     * SUGGESTION 3: Expense reduction targets
     */
    suggestExpenseReduction(shortfallAmount, cashFlowAnalysis, priority) {
        const variableReduction = Math.min(shortfallAmount, cashFlowAnalysis.variableExpenses * 0.3);
        const fixedReduction = shortfallAmount - variableReduction;
        let description = "";
        let impact = "";
        if (fixedReduction <= 0) {
            description = `Reduce variable expenses by ₹${variableReduction.toFixed(0)} (${((variableReduction / cashFlowAnalysis.variableExpenses) * 100).toFixed(0)}% of current spending)`;
            impact = "Achievable by cutting discretionary spending (dining, entertainment, shopping). Covers shortfall without affecting fixed commitments.";
        }
        else {
            description = `Reduce expenses: ₹${variableReduction.toFixed(0)} from variable + ₹${fixedReduction.toFixed(0)} from fixed expenses`;
            impact = "Requires lifestyle changes. Review subscriptions, negotiate bills, or find cheaper alternatives for fixed costs.";
        }
        return {
            type: "expense_reduction",
            description,
            impact,
            amountInvolved: shortfallAmount,
            priority
        };
    }
    /**
     * SUGGESTION 4: Income awareness (NOT loan suggestion)
     */
    suggestIncomeAwareness(shortfallAmount, monthlyIncome, priority) {
        const incomeGapPercent = (shortfallAmount / monthlyIncome) * 100;
        return {
            type: "income_awareness",
            description: `Income-expense gap: ₹${shortfallAmount.toFixed(0)} (${incomeGapPercent.toFixed(1)}% of monthly income)`,
            impact: "Consider supplementary income sources, freelancing, or one-time asset liquidation if sustainable. Avoid high-interest loans.",
            amountInvolved: shortfallAmount,
            priority
        };
    }
    /**
     * Generate scenario comparisons
     */
    generateScenarios(cashFlowAnalysis) {
        const { totalRequiredPayments, availableCash, requiredPayments } = cashFlowAnalysis;
        const scenarios = [];
        // SCENARIO 1: Pay all minimums (ideal)
        scenarios.push({
            name: "Pay All Minimum Dues",
            totalPayment: totalRequiredPayments,
            shortfallReduction: totalRequiredPayments,
            creditScoreImpact: "protected",
            explanation: `Pay ₹${totalRequiredPayments.toFixed(0)} across ${requiredPayments.length} card(s). Credit score fully protected. Requires ₹${(totalRequiredPayments - availableCash).toFixed(0)} additional cash.`
        });
        // SCENARIO 2: Pay minimums only on high-priority cards
        const highPriorityCards = requiredPayments.slice(0, Math.ceil(requiredPayments.length / 2));
        const highPriorityTotal = highPriorityCards.reduce((sum, p) => sum + p.minimumDue, 0);
        scenarios.push({
            name: "Pay High-Priority Cards Only",
            totalPayment: highPriorityTotal,
            shortfallReduction: highPriorityTotal,
            creditScoreImpact: "minor_impact",
            explanation: `Pay ₹${highPriorityTotal.toFixed(0)} on ${highPriorityCards.length} card(s) with earliest due dates. Protects most critical cards. ${requiredPayments.length - highPriorityCards.length} card(s) will incur late fees.`
        });
        // SCENARIO 3: Defer all payments (worst case)
        scenarios.push({
            name: "Defer All Payments",
            totalPayment: 0,
            shortfallReduction: 0,
            creditScoreImpact: "major_impact",
            explanation: `No payments made. All ${requiredPayments.length} card(s) will report late payment. Severe credit score damage. Late fees and interest will compound.`
        });
        return scenarios;
    }
}
exports.default = new RecoveryPlannerService();
