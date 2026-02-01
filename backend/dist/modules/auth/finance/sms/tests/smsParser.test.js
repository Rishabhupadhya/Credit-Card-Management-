"use strict";
/**
 * SMS Parser Test Cases
 *
 * Real-world SMS samples from different banks for testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = exports.nonTransactionSamples = exports.axisSamples = exports.sbiSamples = exports.hdfcSamples = exports.iciciSamples = void 0;
// ICICI Bank Samples
exports.iciciSamples = [
    {
        sms: "Your ICICI Bank Credit Card XX1234 has been debited with INR 5,432.00 on 31-Jan-26 at AMAZON. Avbl bal: INR 89,568.00",
        expected: {
            amount: 5432,
            merchantName: "AMAZON",
            maskedCardNumber: "1234",
            bankName: "ICICI"
        }
    },
    {
        sms: "Your Credit Card XX4567 has been used for INR 2,150.00 at SWIGGY on 31-Jan-2026. Available limit: 97,850.00",
        expected: {
            amount: 2150,
            merchantName: "SWIGGY",
            maskedCardNumber: "4567",
            bankName: "ICICI"
        }
    },
    {
        sms: "ICICI Bank: Your Card ending 9876 debited Rs. 12,345.67 at FLIPKART on 15-Jan-26",
        expected: {
            amount: 12345.67,
            merchantName: "FLIPKART",
            maskedCardNumber: "9876",
            bankName: "ICICI"
        }
    }
];
// HDFC Bank Samples
exports.hdfcSamples = [
    {
        sms: "Your HDFC Bank Credit Card ending 5678 is used for Rs.3,250.00 at ZOMATO on 31-01-26. Avl Lmt: Rs.96,750.00",
        expected: {
            amount: 3250,
            merchantName: "ZOMATO",
            maskedCardNumber: "5678",
            bankName: "HDFC"
        }
    },
    {
        sms: "HDFC Bank Credit Card XX9876 debited for INR 12,500.00 on 31/01/2026 at FLIPKART.",
        expected: {
            amount: 12500,
            merchantName: "FLIPKART",
            maskedCardNumber: "9876",
            bankName: "HDFC"
        }
    },
    {
        sms: "Dear Customer, your HDFC Credit Card 5432 has been charged Rs 899.00 at NETFLIX on 31Jan26",
        expected: {
            amount: 899,
            merchantName: "NETFLIX",
            maskedCardNumber: "5432",
            bankName: "HDFC"
        }
    }
];
// SBI Samples
exports.sbiSamples = [
    {
        sms: "Your SBI Credit Card XX3456 used for Rs 4,567.89 at AMAZON on 31/01/26. Available credit limit Rs 95,432.11",
        expected: {
            amount: 4567.89,
            merchantName: "AMAZON",
            maskedCardNumber: "3456",
            bankName: "SBI"
        }
    },
    {
        sms: "Dear Customer, Rs.6,780.00 debited from your SBI Card ending 7890 at MYNTRA on 31-Jan-2026",
        expected: {
            amount: 6780,
            merchantName: "MYNTRA",
            maskedCardNumber: "7890",
            bankName: "SBI"
        }
    },
    {
        sms: "SBI Card XX1234: Purchase of INR 1,250.00 at UBER on 31.01.2026",
        expected: {
            amount: 1250,
            merchantName: "UBER",
            maskedCardNumber: "1234",
            bankName: "SBI"
        }
    }
];
// Axis Bank Samples
exports.axisSamples = [
    {
        sms: "Your Axis Bank Credit Card XX2345 is debited with Rs.8,900.50 for a transaction at SWIGGY on 31-Jan-26",
        expected: {
            amount: 8900.50,
            merchantName: "SWIGGY",
            maskedCardNumber: "2345",
            bankName: "Axis"
        }
    },
    {
        sms: "Dear Customer, INR 3,450.00 spent on Axis Credit Card ending 6789 at BIGBASKET on 31/01/2026",
        expected: {
            amount: 3450,
            merchantName: "BIGBASKET",
            maskedCardNumber: "6789",
            bankName: "Axis"
        }
    },
    {
        sms: "Axis Bank: Your Card 4321 charged Rs 2,100.00 at BOOKMYSHOW on 31.01.26",
        expected: {
            amount: 2100,
            merchantName: "BOOKMYSHOW",
            maskedCardNumber: "4321",
            bankName: "Axis"
        }
    }
];
// Non-transaction SMS (should be ignored)
exports.nonTransactionSamples = [
    "Your OTP for ICICI Bank Credit Card is 123456. Valid for 5 minutes.",
    "HDFC Bank: Your credit card statement is now available. Login to view.",
    "Congratulations! Your transaction of Rs.5000 at AMAZON has been reversed.",
    "SBI Credit Card: Promotional offer - Get 10% cashback on dining.",
    "Axis Bank: Your credit card payment of Rs.10000 has been received. Thank you.",
    "Your ICICI Credit Card XX1234 has been credited with Rs.2000 as refund from FLIPKART"
];
/**
 * Test helper function
 */
const runTests = (parser, samples) => {
    const results = [];
    samples.forEach((sample, index) => {
        const parsed = parser.parse(sample.sms, new Date());
        const passed = parsed &&
            parsed.amount === sample.expected.amount &&
            parsed.merchantName === sample.expected.merchantName &&
            parsed.maskedCardNumber === sample.expected.maskedCardNumber &&
            parsed.bankName === sample.expected.bankName;
        results.push({
            testCase: index + 1,
            passed,
            sms: sample.sms,
            expected: sample.expected,
            actual: parsed ? {
                amount: parsed.amount,
                merchantName: parsed.merchantName,
                maskedCardNumber: parsed.maskedCardNumber,
                bankName: parsed.bankName
            } : null
        });
    });
    return results;
};
exports.runTests = runTests;
