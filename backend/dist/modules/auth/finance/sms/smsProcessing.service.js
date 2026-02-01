"use strict";
/**
 * SMS Processing Service
 *
 * Orchestrates the entire SMS-to-alert pipeline:
 * 1. Parse incoming SMS
 * 2. Match to user's credit card
 * 3. Update monthly spending
 * 4. Check limit breach
 * 5. Trigger alerts if needed
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSmsParsing = exports.getSupportedBanks = exports.processSms = void 0;
const mongoose_1 = require("mongoose");
const smsParser_interface_1 = require("./smsParser.interface");
const iciciParser_1 = require("./parsers/iciciParser");
const hdfcParser_1 = require("./parsers/hdfcParser");
const sbiParser_1 = require("./parsers/sbiParser");
const axisParser_1 = require("./parsers/axisParser");
const monthlySpending_service_1 = require("./monthlySpending.service");
const alert_service_1 = require("./alert.service");
const creditCard_model_1 = require("../creditCard.model");
const finance_model_1 = require("../finance.model");
const logger_1 = require("../../../../utils/logger");
// Initialize parser factory with all bank parsers
const parserFactory = new smsParser_interface_1.SmsParserFactory();
parserFactory.registerParser(new iciciParser_1.IciciSmsParser());
parserFactory.registerParser(new hdfcParser_1.HdfcSmsParser());
parserFactory.registerParser(new sbiParser_1.SbiSmsParser());
parserFactory.registerParser(new axisParser_1.AxisSmsParser());
/**
 * Find user's credit card by last 4 digits and bank name
 */
const findCreditCard = async (userId, last4Digits, bankName) => {
    const query = {
        userId: new mongoose_1.Types.ObjectId(userId),
        isActive: true,
        bankName: new RegExp(bankName, "i") // Case-insensitive match
    };
    if (last4Digits) {
        query.last4Digits = last4Digits;
    }
    return await creditCard_model_1.CreditCard.findOne(query);
};
/**
 * Process incoming SMS message
 *
 * @param userId User ID who received the SMS
 * @param smsText Raw SMS text
 * @param receivedAt When SMS was received (defaults to now)
 * @returns Processing result with status and details
 */
const processSms = async (userId, smsText, receivedAt = new Date()) => {
    try {
        // Step 1: Parse SMS
        logger_1.logger.info(`Processing SMS for user ${userId}`);
        const parsedData = parserFactory.parse(smsText, receivedAt);
        if (!parsedData || !parsedData.isValid) {
            return {
                success: false,
                message: "SMS could not be parsed or is not a credit card transaction"
            };
        }
        logger_1.logger.info(`Parsed transaction: ${parsedData.bankName}, ₹${parsedData.amount} at ${parsedData.merchantName}`);
        // Step 2: Find matching credit card
        const card = await findCreditCard(userId, parsedData.maskedCardNumber, parsedData.bankName);
        if (!card) {
            return {
                success: false,
                message: `No matching credit card found for ${parsedData.bankName}${parsedData.maskedCardNumber ? ` ending ${parsedData.maskedCardNumber}` : ""}`,
                parsedData
            };
        }
        logger_1.logger.info(`Matched card: ${card.cardName} (${card._id})`);
        // Step 3: Create transaction record
        const transaction = await finance_model_1.Transaction.create({
            userId: new mongoose_1.Types.ObjectId(userId),
            type: "expense",
            amount: parsedData.amount,
            category: "Credit Card Expense",
            description: `${parsedData.merchantName} - Auto-imported from SMS`,
            payment: `${card.bankName} ${card.cardName}`,
            date: parsedData.transactionDate || receivedAt,
            isRecurring: false,
            paymentType: "credit",
            creditCardId: card._id,
            teamId: card.teamId
        });
        logger_1.logger.info(`Created transaction: ${transaction._id}`);
        // Step 4: Update monthly spending
        const monthlySpending = await (0, monthlySpending_service_1.addTransactionToMonthly)(userId, card._id.toString(), parsedData.amount, parsedData.transactionDate || receivedAt);
        // Step 5: Check if monthly limit is breached
        let limitBreached = false;
        let alertSent = false;
        if (card.monthlyLimit && card.monthlyLimit > 0) {
            const limitCheck = await (0, monthlySpending_service_1.checkMonthlyLimit)(userId, card._id.toString(), card.monthlyLimit, (0, monthlySpending_service_1.getCurrentMonth)(parsedData.transactionDate || receivedAt));
            if (limitCheck.isBreached) {
                limitBreached = true;
                logger_1.logger.warn(`Monthly limit breached for card ${card.cardName}: ₹${limitCheck.currentSpent} / ₹${limitCheck.monthlyLimit}`);
                // Step 6: Send alert
                // TODO: Get user email/phone from User model
                await (0, alert_service_1.sendLimitBreachAlert)(userId, undefined, // userEmail - should be fetched from User model
                undefined, // userPhone - should be fetched from User model
                card.cardName, card.bankName, card.last4Digits, limitCheck.currentSpent, limitCheck.monthlyLimit, (0, monthlySpending_service_1.getCurrentMonth)(parsedData.transactionDate || receivedAt));
                alertSent = true;
                logger_1.logger.info("Limit breach alert sent");
            }
        }
        return {
            success: true,
            message: "SMS processed successfully",
            parsedData,
            transactionId: transaction._id.toString(),
            limitBreached,
            alertSent
        };
    }
    catch (error) {
        logger_1.logger.error("Error processing SMS:", error);
        return {
            success: false,
            message: `Error processing SMS: ${error.message}`
        };
    }
};
exports.processSms = processSms;
/**
 * Get list of supported banks
 */
const getSupportedBanks = () => {
    return parserFactory.getRegisteredBanks();
};
exports.getSupportedBanks = getSupportedBanks;
/**
 * Test SMS parsing without saving to database
 * Useful for testing and validation
 */
const testSmsParsing = (smsText, receivedAt = new Date()) => {
    return parserFactory.parse(smsText, receivedAt);
};
exports.testSmsParsing = testSmsParsing;
