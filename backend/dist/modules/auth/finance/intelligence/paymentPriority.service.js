"use strict";
/**
 * MODULE 2: Credit Card Payment Priority Engine
 *
 * Determines which credit card bills are MOST IMPORTANT to pay first
 * based on deterministic, explainable rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const creditCard_model_1 = require("../creditCard.model");
class PaymentPriorityService {
    /**
     * Generate payment priority plan for all active cards
     */
    async generatePaymentPriority(userId) {
        // Fetch all active credit cards
        const cards = await creditCard_model_1.CreditCard.find({
            userId: new mongoose_1.Types.ObjectId(userId),
            isActive: true
        });
        console.log(`[PaymentPriority] Found ${cards.length} active cards for user ${userId}`);
        if (cards.length === 0) {
            throw new Error("No active credit cards found. Please add credit cards first.");
        }
        // Calculate priority for each card
        const priorityItems = [];
        for (const card of cards) {
            const priorityItem = this.calculateCardPriority(card);
            priorityItems.push(priorityItem);
        }
        // Sort by priority (1 = highest)
        priorityItems.sort((a, b) => a.priority - b.priority);
        // Reassign clean priority numbers after sorting
        priorityItems.forEach((item, index) => {
            item.priority = index + 1;
        });
        // Calculate totals
        const totalMinimumDue = priorityItems.reduce((sum, item) => sum + item.minimumDue, 0);
        const totalOutstanding = priorityItems.reduce((sum, item) => sum + item.totalOutstanding, 0);
        return {
            userId,
            totalMinimumDueAcrossCards: totalMinimumDue,
            totalOutstandingAcrossCards: totalOutstanding,
            paymentOrder: priorityItems,
            generatedAt: new Date()
        };
    }
    /**
     * Calculate priority for a single card
     * Lower score = higher priority (pay first)
     */
    calculateCardPriority(card) {
        const today = new Date();
        const daysUntilDue = this.calculateDaysUntilDue(card.dueDateDay);
        const utilizationPercent = (card.outstandingAmount / card.creditLimit) * 100;
        // Calculate minimum due (typically 5% of outstanding or ₹100, whichever is higher)
        const minimumDue = Math.max(card.outstandingAmount * 0.05, 100);
        // Priority Score Calculation (lower = more urgent)
        let priorityScore = 0;
        const riskFactors = [];
        // RULE 1: Days until due (most critical)
        if (daysUntilDue <= 2) {
            priorityScore += 1000; // Highest priority
            riskFactors.push({
                factor: `Due in ${daysUntilDue} day(s)`,
                severity: "critical"
            });
        }
        else if (daysUntilDue <= 5) {
            priorityScore += 500;
            riskFactors.push({
                factor: `Due in ${daysUntilDue} days`,
                severity: "high"
            });
        }
        else if (daysUntilDue <= 10) {
            priorityScore += 100;
            riskFactors.push({
                factor: `Due in ${daysUntilDue} days`,
                severity: "medium"
            });
        }
        else {
            priorityScore += 10;
            riskFactors.push({
                factor: `Due in ${daysUntilDue} days`,
                severity: "low"
            });
        }
        // RULE 2: High utilization (impacts credit score)
        if (utilizationPercent > 70) {
            priorityScore += 200;
            riskFactors.push({
                factor: `Utilization ${utilizationPercent.toFixed(0)}% (Very High)`,
                severity: "critical"
            });
        }
        else if (utilizationPercent > 50) {
            priorityScore += 100;
            riskFactors.push({
                factor: `Utilization ${utilizationPercent.toFixed(0)}% (High)`,
                severity: "high"
            });
        }
        else if (utilizationPercent > 30) {
            priorityScore += 50;
            riskFactors.push({
                factor: `Utilization ${utilizationPercent.toFixed(0)}% (Moderate)`,
                severity: "medium"
            });
        }
        // RULE 3: Interest rate (if available)
        if (card.interestRate && card.interestRate > 36) {
            priorityScore += 30;
            riskFactors.push({
                factor: `High interest rate: ${card.interestRate}%`,
                severity: "medium"
            });
        }
        // RULE 4: Outstanding amount (larger balances matter more)
        if (card.outstandingAmount > 50000) {
            priorityScore += 20;
            riskFactors.push({
                factor: `Large outstanding: ₹${card.outstandingAmount.toFixed(0)}`,
                severity: "medium"
            });
        }
        // Generate explanation
        const explanation = this.generateExplanation(card.cardName, daysUntilDue, utilizationPercent, riskFactors);
        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + daysUntilDue);
        return {
            creditCardId: card._id.toString(),
            cardName: card.cardName,
            priority: priorityScore, // Will be re-sorted later
            minimumDue,
            totalOutstanding: card.outstandingAmount,
            dueDate,
            daysUntilDue,
            utilizationPercent,
            riskFactors,
            explanation
        };
    }
    /**
     * Generate human-readable explanation for priority
     */
    generateExplanation(cardName, daysUntilDue, utilizationPercent, riskFactors) {
        const criticalFactors = riskFactors.filter((f) => f.severity === "critical");
        const highFactors = riskFactors.filter((f) => f.severity === "high");
        if (criticalFactors.length > 0) {
            return `🔴 URGENT: ${cardName} requires immediate attention. ${criticalFactors.map(f => f.factor).join(", ")}.`;
        }
        if (highFactors.length > 0) {
            return `🟠 HIGH PRIORITY: ${cardName} should be paid soon. ${highFactors.map(f => f.factor).join(", ")}.`;
        }
        if (daysUntilDue <= 10) {
            return `🟡 MODERATE: ${cardName} payment due in ${daysUntilDue} days. Plan payment to avoid late fees.`;
        }
        return `🟢 LOW PRIORITY: ${cardName} payment is not urgent (${daysUntilDue} days remaining).`;
    }
    /**
     * Helper: Calculate days until due date
     */
    calculateDaysUntilDue(dueDateDay) {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        let dueDate = new Date(currentYear, currentMonth, dueDateDay);
        // If due date has passed this month, use next month
        if (dueDateDay < currentDay) {
            dueDate.setMonth(currentMonth + 1);
        }
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
}
exports.default = new PaymentPriorityService();
