"use strict";
/**
 * Email Parser Test Cases
 *
 * Sample bank transaction emails for testing parsers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runParserTests = exports.nonTransactionEmails = exports.axisTestEmails = exports.sbiTestEmails = exports.hdfcTestEmails = exports.iciciTestEmails = void 0;
const iciciEmailParser_1 = require("../parsers/iciciEmailParser");
const hdfcEmailParser_1 = require("../parsers/hdfcEmailParser");
const sbiEmailParser_1 = require("../parsers/sbiEmailParser");
const axisEmailParser_1 = require("../parsers/axisEmailParser");
const genericEmailParser_1 = require("../parsers/genericEmailParser");
// ICICI Bank test emails
exports.iciciTestEmails = [
    {
        messageId: "test-icici-001",
        subject: "Alert: Card transaction for Rs 5,432.00",
        from: "alerts@icicibank.com",
        body: "Your ICICI Bank Credit Card ending 1234 has been used for Rs 5,432.00 at AMAZON on 31-Jan-26 at 14:30. Available balance: Rs 89,568.00",
        receivedDate: new Date("2026-01-31T14:30:00Z")
    },
    {
        messageId: "test-icici-002",
        subject: "Transaction notification",
        from: "credit.cards@icicibank.com",
        body: "Your Credit Card XX4567 has been debited with INR 2,150.00 at SWIGGY on 31-Jan-2026. Available limit: 97,850.00",
        receivedDate: new Date("2026-01-31T12:00:00Z")
    },
    {
        messageId: "test-icici-003-otp",
        subject: "OTP for ICICI Credit Card",
        from: "alerts@icicibank.com",
        body: "Your OTP for ICICI Credit Card transaction is 123456. Valid for 10 minutes.",
        receivedDate: new Date("2026-01-31T10:00:00Z")
    }
];
// HDFC Bank test emails
exports.hdfcTestEmails = [
    {
        messageId: "test-hdfc-001",
        subject: "Transaction Alert on your HDFC Bank Credit Card",
        from: "alerts@hdfcbank.com",
        body: "Your HDFC Bank Credit Card ending 5678 is used for Rs.3,250.00 at ZOMATO on 31-01-26 at 19:45. Available limit: Rs.96,750.00",
        receivedDate: new Date("2026-01-31T19:45:00Z")
    },
    {
        messageId: "test-hdfc-002",
        subject: "HDFC Credit Card charged",
        from: "creditcards@hdfcbank.net",
        body: "Dear Customer, your HDFC Credit Card 5432 has been charged Rs 899.00 at NETFLIX on 31Jan26",
        receivedDate: new Date("2026-01-31T08:00:00Z")
    }
];
// SBI test emails
exports.sbiTestEmails = [
    {
        messageId: "test-sbi-001",
        subject: "SBI Card Alert - Transaction",
        from: "alerts@sbicard.com",
        body: "Your SBI Credit Card ending 3456 used for Rs 4,567.89 at FLIPKART on 31/01/26 at 10:15. Available credit limit Rs 95,432.11",
        receivedDate: new Date("2026-01-31T10:15:00Z")
    },
    {
        messageId: "test-sbi-002",
        subject: "State Bank Card Transaction",
        from: "sbicard@sbi.co.in",
        body: "Dear Customer, Rs.6,780.00 debited from your SBI Card ending 7890 at MYNTRA on 31-Jan-2026",
        receivedDate: new Date("2026-01-31T16:20:00Z")
    }
];
// Axis Bank test emails
exports.axisTestEmails = [
    {
        messageId: "test-axis-001",
        subject: "Axis Bank Credit Card - Transaction Alert",
        from: "alerts@axisbank.com",
        body: "Your Axis Bank Credit Card ending 2345 is debited with Rs.8,900.50 for a transaction at SWIGGY on 31-Jan-26",
        receivedDate: new Date("2026-01-31T13:00:00Z")
    },
    {
        messageId: "test-axis-002",
        subject: "Axis Card charged",
        from: "creditcard@axisbank.com",
        body: "Dear Customer, INR 2,100.00 spent on Axis Credit Card 4321 at BOOKMYSHOW on 31.01.26",
        receivedDate: new Date("2026-01-31T18:30:00Z")
    }
];
// Non-transaction emails (should return null)
exports.nonTransactionEmails = [
    {
        messageId: "test-non-001",
        subject: "OTP for ICICI Credit Card",
        from: "alerts@icicibank.com",
        body: "Your One Time Password is 123456. Valid for 10 minutes.",
        receivedDate: new Date("2026-01-31T10:00:00Z")
    },
    {
        messageId: "test-non-002",
        subject: "Exclusive Cashback Offer!",
        from: "marketing@hdfcbank.com",
        body: "Get 10% cashback on all transactions this month! Terms and conditions apply.",
        receivedDate: new Date("2026-01-31T09:00:00Z")
    },
    {
        messageId: "test-non-003",
        subject: "Your Monthly Statement is Ready",
        from: "statements@sbicard.com",
        body: "Your SBI Credit Card statement for January 2026 is now available. Please log in to view.",
        receivedDate: new Date("2026-01-31T07:00:00Z")
    }
];
/**
 * Run tests for a specific parser
 */
const runParserTests = () => {
    console.log("=".repeat(60));
    console.log("EMAIL PARSER TEST SUITE");
    console.log("=".repeat(60));
    // Test ICICI parser
    console.log("\n📧 ICICI Bank Parser Tests:");
    const iciciParser = new iciciEmailParser_1.IciciEmailParser();
    exports.iciciTestEmails.forEach((email, idx) => {
        const parsed = iciciParser.parse(email);
        const isOtp = email.messageId.includes("otp");
        const shouldBeNull = isOtp;
        const passed = shouldBeNull ? parsed === null : parsed !== null && parsed.isValid;
        console.log(`  Test ${idx + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
        if (!passed) {
            console.log(`    Expected: ${shouldBeNull ? "null" : "valid transaction"}`);
            console.log(`    Got: ${parsed ? JSON.stringify(parsed) : "null"}`);
        }
        else if (parsed) {
            console.log(`    Amount: ₹${parsed.amount}, Merchant: ${parsed.merchantName}, Card: ${parsed.maskedCardNumber}`);
        }
    });
    // Test HDFC parser
    console.log("\n💳 HDFC Bank Parser Tests:");
    const hdfcParser = new hdfcEmailParser_1.HdfcEmailParser();
    exports.hdfcTestEmails.forEach((email, idx) => {
        const parsed = hdfcParser.parse(email);
        const passed = parsed !== null && parsed.isValid;
        console.log(`  Test ${idx + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
        if (parsed) {
            console.log(`    Amount: ₹${parsed.amount}, Merchant: ${parsed.merchantName}, Card: ${parsed.maskedCardNumber}`);
        }
    });
    // Test SBI parser
    console.log("\n🏦 SBI Parser Tests:");
    const sbiParser = new sbiEmailParser_1.SbiEmailParser();
    exports.sbiTestEmails.forEach((email, idx) => {
        const parsed = sbiParser.parse(email);
        const passed = parsed !== null && parsed.isValid;
        console.log(`  Test ${idx + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
        if (parsed) {
            console.log(`    Amount: ₹${parsed.amount}, Merchant: ${parsed.merchantName}, Card: ${parsed.maskedCardNumber}`);
        }
    });
    // Test Axis parser
    console.log("\n🔷 Axis Bank Parser Tests:");
    const axisParser = new axisEmailParser_1.AxisEmailParser();
    exports.axisTestEmails.forEach((email, idx) => {
        const parsed = axisParser.parse(email);
        const passed = parsed !== null && parsed.isValid;
        console.log(`  Test ${idx + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
        if (parsed) {
            console.log(`    Amount: ₹${parsed.amount}, Merchant: ${parsed.merchantName}, Card: ${parsed.maskedCardNumber}`);
        }
    });
    // Test non-transaction emails
    console.log("\n🚫 Non-Transaction Email Tests (should all return null):");
    const genericParser = new genericEmailParser_1.GenericEmailParser();
    exports.nonTransactionEmails.forEach((email, idx) => {
        const parsed = genericParser.parse(email);
        const passed = parsed === null;
        console.log(`  Test ${idx + 1}: ${passed ? "✅ PASS" : "❌ FAIL"} (${email.subject})`);
    });
    console.log("\n" + "=".repeat(60));
    console.log("Test suite complete!");
    console.log("=".repeat(60));
};
exports.runParserTests = runParserTests;
// Run tests if executed directly
if (require.main === module) {
    (0, exports.runParserTests)();
}
