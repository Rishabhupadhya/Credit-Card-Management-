"use strict";
/**
 * Complete OAuth Flow and Fetch January Transactions
 * This handles the full OAuth process including callback simulation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
const googleapis_1 = require("googleapis");
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../../../../config/env");
const emailOAuthToken_model_1 = require("./models/emailOAuthToken.model");
const emailProcessing_service_1 = require("./emailProcessing.service");
const emailAuth_service_1 = require("./emailAuth.service");
const logger_1 = require("../../../../utils/logger");
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
        console.log("║        🚀 Complete Gmail OAuth & Fetch January            ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
        // Connect to database
        await mongoose_1.default.connect(env_1.env.MONGO_URI);
        console.log("✅ Database connected\n");
        // Get user ID
        const userId = await question("Enter your User ID (from login response): ");
        if (!userId.trim()) {
            throw new Error("User ID is required");
        }
        // Check if token already exists
        const existingToken = await emailOAuthToken_model_1.EmailOAuthToken.findOne({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            provider: "gmail",
        });
        if (existingToken) {
            console.log("✅ Gmail already authorized!\n");
            console.log("📅 Fetching January 2026 emails...\n");
            const result = await (0, emailProcessing_service_1.processEmails)(userId, "gmail", "", 31);
            console.log("\n╔════════════════════════════════════════════════════════════╗");
            console.log("║                     📊 RESULTS                             ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
            console.log(`✅ Success: ${result.success}`);
            console.log(`📧 Emails processed: ${result.emailsProcessed}`);
            console.log(`💳 Transactions created: ${result.transactionsCreated}`);
            console.log(`🔄 Duplicates skipped: ${result.duplicatesSkipped}`);
            console.log(`❌ Parse failures: ${result.parseFailures}`);
            console.log(`⚠️  Limit breach alerts: ${result.limitBreachAlerts}\n`);
            await mongoose_1.default.connection.close();
            rl.close();
            return;
        }
        // Create OAuth2 client
        const oauth2Client = new googleapis_1.google.auth.OAuth2(emailAuth_service_1.OAUTH_CONFIG.gmail.clientId, emailAuth_service_1.OAUTH_CONFIG.gmail.clientSecret, emailAuth_service_1.OAUTH_CONFIG.gmail.redirectUri);
        // Generate auth URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: emailAuth_service_1.OAUTH_CONFIG.gmail.scopes,
            state: userId,
            prompt: "consent",
        });
        console.log("🔗 Step 1: Authorize Gmail\n");
        console.log("Open this URL in your browser:\n");
        console.log(authUrl);
        console.log("\n");
        const authCode = await question("After authorizing, paste the authorization code here: ");
        if (!authCode.trim()) {
            throw new Error("Authorization code is required");
        }
        console.log("\n⚙️  Exchanging code for access token...");
        // Exchange code for token
        await (0, emailAuth_service_1.exchangeGmailCode)(authCode.trim(), userId);
        console.log("✅ Gmail authorized and token saved!\n");
        // Now fetch January emails
        console.log("📅 Fetching January 2026 emails...\n");
        const result = await (0, emailProcessing_service_1.processEmails)(userId, "gmail", "", 31);
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
        }
        else if (result.emailsProcessed === 0) {
            console.log("\n⚠️  No bank emails found in January.");
        }
        console.log("\n✨ Done!\n");
    }
    catch (error) {
        console.error("\n❌ Error:", error);
        logger_1.logger.error("OAuth flow failed:", error);
    }
    finally {
        await mongoose_1.default.connection.close();
        rl.close();
        process.exit(0);
    }
}
if (require.main === module) {
    main();
}
