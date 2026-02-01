"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const node_cron_1 = __importDefault(require("node-cron"));
const finance_service_1 = require("./modules/auth/finance/finance.service");
const startServer = async () => {
    await (0, db_1.connectDB)();
    app_1.app.listen(env_1.env.PORT, () => {
        logger_1.logger.info(`Server running on port ${env_1.env.PORT}`);
    });
    // Schedule recurring transactions to process daily at 00:01 AM
    node_cron_1.default.schedule("1 0 * * *", async () => {
        logger_1.logger.info("Processing recurring transactions...");
        try {
            await (0, finance_service_1.processRecurringTransactions)();
            logger_1.logger.info("Recurring transactions processed successfully");
        }
        catch (error) {
            logger_1.logger.error("Error processing recurring transactions:", error);
        }
    });
    logger_1.logger.info("Recurring transaction scheduler started (runs daily at 00:01 AM)");
};
startServer();
