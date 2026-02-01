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
exports.checkSpendingSpike = exports.getCreditAlerts = exports.getCardUtilization = exports.getUtilizationOverview = exports.deleteCreditCard = exports.updateCreditCard = exports.getCreditCardById = exports.getCreditCards = exports.createCreditCard = void 0;
const creditCardService = __importStar(require("./creditCard.service"));
const logger_1 = require("../../../utils/logger");
const createCreditCard = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { teamId, cardName, bankName, last4Digits, creditLimit, outstandingAmount, billingCycleStartDay, dueDateDay, interestRate } = req.body;
        // Validation
        if (!cardName || !bankName || !last4Digits || !creditLimit || !billingCycleStartDay || !dueDateDay) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (!/^\d{4}$/.test(last4Digits)) {
            return res.status(400).json({ message: "last4Digits must be exactly 4 digits" });
        }
        if (billingCycleStartDay < 1 || billingCycleStartDay > 31) {
            return res.status(400).json({ message: "billingCycleStartDay must be between 1 and 31" });
        }
        if (dueDateDay < 1 || dueDateDay > 31) {
            return res.status(400).json({ message: "dueDateDay must be between 1 and 31" });
        }
        const card = await creditCardService.createCreditCard(userId, {
            teamId,
            cardName,
            bankName,
            last4Digits,
            creditLimit: Number(creditLimit),
            outstandingAmount: outstandingAmount ? Number(outstandingAmount) : 0,
            billingCycleStartDay: Number(billingCycleStartDay),
            dueDateDay: Number(dueDateDay),
            interestRate: interestRate ? Number(interestRate) : undefined
        });
        logger_1.logger.info(`Credit card created: ${card._id} by user ${userId}`);
        res.status(201).json(card);
    }
    catch (error) {
        logger_1.logger.error("Error creating credit card:", error);
        res.status(500).json({ message: "Failed to create credit card", error });
    }
};
exports.createCreditCard = createCreditCard;
const getCreditCards = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { teamId } = req.query;
        const cards = await creditCardService.getCreditCards(userId, teamId);
        res.json(cards);
    }
    catch (error) {
        logger_1.logger.error("Error fetching credit cards:", error);
        res.status(500).json({ message: "Failed to fetch credit cards", error });
    }
};
exports.getCreditCards = getCreditCards;
const getCreditCardById = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { cardId } = req.params;
        const card = await creditCardService.getCreditCardById(cardId, userId);
        if (!card) {
            return res.status(404).json({ message: "Credit card not found" });
        }
        res.json(card);
    }
    catch (error) {
        logger_1.logger.error("Error fetching credit card:", error);
        res.status(500).json({ message: "Failed to fetch credit card", error });
    }
};
exports.getCreditCardById = getCreditCardById;
const updateCreditCard = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { cardId } = req.params;
        const updates = req.body;
        // Don't allow updating userId, ownerId, or timestamps
        delete updates.userId;
        delete updates.ownerId;
        delete updates.createdAt;
        delete updates.updatedAt;
        const card = await creditCardService.updateCreditCard(cardId, userId, updates);
        if (!card) {
            return res.status(404).json({ message: "Credit card not found" });
        }
        logger_1.logger.info(`Credit card updated: ${cardId} by user ${userId}`);
        res.json(card);
    }
    catch (error) {
        logger_1.logger.error("Error updating credit card:", error);
        res.status(500).json({ message: "Failed to update credit card", error });
    }
};
exports.updateCreditCard = updateCreditCard;
const deleteCreditCard = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { cardId } = req.params;
        await creditCardService.deleteCreditCard(cardId, userId);
        logger_1.logger.info(`Credit card deleted: ${cardId} by user ${userId}`);
        res.json({ message: "Credit card deleted successfully" });
    }
    catch (error) {
        logger_1.logger.error("Error deleting credit card:", error);
        res.status(500).json({ message: "Failed to delete credit card", error });
    }
};
exports.deleteCreditCard = deleteCreditCard;
const getUtilizationOverview = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { teamId } = req.query;
        const overview = await creditCardService.calculateOverallUtilization(userId, teamId);
        res.json(overview);
    }
    catch (error) {
        logger_1.logger.error("Error calculating utilization:", error);
        res.status(500).json({ message: "Failed to calculate utilization", error });
    }
};
exports.getUtilizationOverview = getUtilizationOverview;
const getCardUtilization = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { cardId } = req.params;
        const card = await creditCardService.getCreditCardById(cardId, userId);
        if (!card) {
            return res.status(404).json({ message: "Credit card not found" });
        }
        const utilization = await creditCardService.calculateCardUtilization(card);
        res.json(utilization);
    }
    catch (error) {
        logger_1.logger.error("Error calculating card utilization:", error);
        res.status(500).json({ message: "Failed to calculate card utilization", error });
    }
};
exports.getCardUtilization = getCardUtilization;
const getCreditAlerts = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { teamId } = req.query;
        const alerts = await creditCardService.generateCreditAlerts(userId, teamId);
        res.json(alerts);
    }
    catch (error) {
        logger_1.logger.error("Error generating credit alerts:", error);
        res.status(500).json({ message: "Failed to generate alerts", error });
    }
};
exports.getCreditAlerts = getCreditAlerts;
const checkSpendingSpike = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { cardId } = req.params;
        const alert = await creditCardService.detectSpendingSpike(cardId, userId);
        res.json(alert);
    }
    catch (error) {
        logger_1.logger.error("Error detecting spending spike:", error);
        res.status(500).json({ message: "Failed to detect spending spike", error });
    }
};
exports.checkSpendingSpike = checkSpendingSpike;
