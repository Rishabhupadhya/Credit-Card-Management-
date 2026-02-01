"use strict";
/**
 * Fetch January Credit Card Transactions from Emails
 *
 * This script helps you:
 * 1. Connect your Gmail/Outlook account
 * 2. Fetch emails from January 2026
 * 3. Parse bank transaction alerts
 * 4. Create transactions in database
 *
 * Usage: npx ts-node src/modules/auth/finance/email/fetchJanuaryEmails.ts
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
const emailAuth_service_1 = require("./emailAuth.service");
const emailProcessing_service_1 = require("./emailProcessing.service");
const logger_1 = require("../../../../utils/logger");
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../../../../config/env");
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const question = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};
async function main() {
    try {
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║   📧 Fetch January Credit Card Transactions from Emails   ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
        // Connect to database
        console.log("📊 Connecting to database...");
        await mongoose_1.default.connect(env_1.env.MONGO_URI);
        console.log("✅ Database connected\n");
        // Get user ID
        const userId = await question("Enter your User ID (from MongoDB): ");
        if (!userId.trim()) {
            throw new Error("User ID is required");
        }
        // Choose provider
        console.log("\nSelect email provider:");
        console.log("1. Gmail");
        console.log("2. Outlook");
        const providerChoice = await question("Enter choice (1 or 2): ");
        const provider = providerChoice === "1" ? "gmail" : "outlook";
        console.log(`\n📧 You selected: ${provider.toUpperCase()}\n`);
        // Check if already connected
        const { EmailOAuthToken } = await Promise.resolve().then(() => __importStar(require("./models/emailOAuthToken.model")));
        const existingToken = await EmailOAuthToken.findOne({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            provider,
        });
        if (!existingToken) {
            console.log("⚠️  Email account not connected yet!");
            console.log("\n📝 Step 1: Authorize your email account\n");
            // Generate OAuth URL
            const authUrl = provider === "gmail"
                ? (0, emailAuth_service_1.getGmailAuthUrl)(userId)
                : (0, emailAuth_service_1.getOutlookAuthUrl)(userId);
            console.log("🔗 Authorization URL:");
            console.log(authUrl);
            console.log("\n📌 Instructions:");
            console.log("1. Copy the URL above");
            console.log("2. Open it in your browser");
            console.log("3. Login and grant permission");
            console.log("4. You'll be redirected back (callback will save token)");
            console.log("\n⏳ After authorizing, press Enter to continue...");
            await question("");
            // Check again for token
            const tokenAfterAuth = await EmailOAuthToken.findOne({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                provider,
            });
            if (!tokenAfterAuth) {
                console.log("\n❌ Token not found. Make sure you completed authorization.");
                console.log("   The callback URL should have saved the token automatically.");
                console.log("\n💡 Alternative: Start your backend server and try the OAuth flow:");
                console.log(`   1. GET http://localhost:5001/api/finance/email/oauth/${provider}/authorize`);
                console.log("   2. Open the returned authUrl in browser");
                console.log("   3. Grant permission");
                console.log("   4. Re-run this script");
                process.exit(1);
            }
            console.log("✅ Token found! Proceeding...\n");
        }
        else {
            console.log("✅ Email account already connected!\n");
        }
        // Calculate days back for January
        const now = new Date("2026-02-01"); // Current date
        const januaryStart = new Date("2026-01-01");
        const daysBack = Math.ceil((now.getTime() - januaryStart.getTime()) / (1000 * 60 * 60 * 24));
        console.log("📅 Fetching emails from January 2026...");
        console.log(`   Days back: ${daysBack} days\n`);
        // Process emails
        console.log("⚙️  Processing emails...\n");
        const result = await (0, emailProcessing_service_1.processEmails)(userId, provider, "", daysBack);
        // Display results
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║                     📊 RESULTS                             ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
        console.log(`✅ Success: ${result.success}`);
        console.log(`📧 Emails processed: ${result.emailsProcessed}`);
        console.log(`💳 Transactions created: ${result.transactionsCreated}`);
        console.log(`🔄 Duplicates skipped: ${result.duplicatesSkipped}`);
        console.log(`❌ Parse failures: ${result.parseFailures}`);
        console.log(`⚠️  Limit breach alerts: ${result.limitBreachAlerts}`);
        if (result.transactionsCreated > 0) {
            console.log("\n🎉 Successfully fetched January transactions!");
            console.log("   Check your database for new transaction records.");
        }
        else if (result.emailsProcessed === 0) {
            console.log("\n⚠️  No emails found from January.");
            console.log("   Make sure your bank sends transaction alerts to this email.");
        }
        else if (result.duplicatesSkipped === result.emailsProcessed) {
            console.log("\n✅ All emails already processed (no duplicates created).");
        }
        else {
            console.log("\n⚠️  Some emails could not be parsed.");
            console.log("   Check logs for details.");
        }
        console.log("\n");
    }
    catch (error) {
        console.error("\n❌ Error:", error);
        logger_1.logger.error("Fetch January emails failed:", error);
    }
    finally {
        await mongoose_1.default.connection.close();
        rl.close();
        process.exit(0);
    }
}
// Run if executed directly
if (require.main === module) {
    main();
}
