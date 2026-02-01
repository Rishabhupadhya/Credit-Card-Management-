"use strict";
/**
 * SMS Parser Test Runner
 *
 * Run this file to test all bank parsers with sample SMS messages
 *
 * Usage: ts-node testRunner.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const iciciParser_1 = require("../parsers/iciciParser");
const hdfcParser_1 = require("../parsers/hdfcParser");
const sbiParser_1 = require("../parsers/sbiParser");
const axisParser_1 = require("../parsers/axisParser");
const smsParser_interface_1 = require("../smsParser.interface");
const smsParser_test_1 = require("./smsParser.test");
console.log("=".repeat(60));
console.log("SMS PARSER TEST SUITE");
console.log("=".repeat(60));
// Test individual parsers
console.log("\n📱 ICICI Bank Parser Tests:");
const iciciParser = new iciciParser_1.IciciSmsParser();
const iciciResults = (0, smsParser_test_1.runTests)(iciciParser, smsParser_test_1.iciciSamples);
iciciResults.forEach(r => {
    console.log(`  Test ${r.testCase}: ${r.passed ? "✅ PASS" : "❌ FAIL"}`);
    if (!r.passed) {
        console.log(`    Expected: ${JSON.stringify(r.expected)}`);
        console.log(`    Actual: ${JSON.stringify(r.actual)}`);
    }
});
console.log("\n💳 HDFC Bank Parser Tests:");
const hdfcParser = new hdfcParser_1.HdfcSmsParser();
const hdfcResults = (0, smsParser_test_1.runTests)(hdfcParser, smsParser_test_1.hdfcSamples);
hdfcResults.forEach(r => {
    console.log(`  Test ${r.testCase}: ${r.passed ? "✅ PASS" : "❌ FAIL"}`);
    if (!r.passed) {
        console.log(`    Expected: ${JSON.stringify(r.expected)}`);
        console.log(`    Actual: ${JSON.stringify(r.actual)}`);
    }
});
console.log("\n🏦 SBI Parser Tests:");
const sbiParser = new sbiParser_1.SbiSmsParser();
const sbiResults = (0, smsParser_test_1.runTests)(sbiParser, smsParser_test_1.sbiSamples);
sbiResults.forEach(r => {
    console.log(`  Test ${r.testCase}: ${r.passed ? "✅ PASS" : "❌ FAIL"}`);
    if (!r.passed) {
        console.log(`    Expected: ${JSON.stringify(r.expected)}`);
        console.log(`    Actual: ${JSON.stringify(r.actual)}`);
    }
});
console.log("\n🔷 Axis Bank Parser Tests:");
const axisParser = new axisParser_1.AxisSmsParser();
const axisResults = (0, smsParser_test_1.runTests)(axisParser, smsParser_test_1.axisSamples);
axisResults.forEach(r => {
    console.log(`  Test ${r.testCase}: ${r.passed ? "✅ PASS" : "❌ FAIL"}`);
    if (!r.passed) {
        console.log(`    Expected: ${JSON.stringify(r.expected)}`);
        console.log(`    Actual: ${JSON.stringify(r.actual)}`);
    }
});
// Test factory with non-transaction messages
console.log("\n🚫 Non-Transaction SMS Tests (should all return null):");
const factory = new smsParser_interface_1.SmsParserFactory();
factory.registerParser(iciciParser);
factory.registerParser(hdfcParser);
factory.registerParser(sbiParser);
factory.registerParser(axisParser);
smsParser_test_1.nonTransactionSamples.forEach((sms, index) => {
    const parsed = factory.parse(sms, new Date());
    const passed = parsed === null;
    console.log(`  Test ${index + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
    if (!passed) {
        console.log(`    SMS: ${sms}`);
        console.log(`    Unexpected parse result: ${JSON.stringify(parsed)}`);
    }
});
// Summary
const allResults = [...iciciResults, ...hdfcResults, ...sbiResults, ...axisResults];
const totalTests = allResults.length + smsParser_test_1.nonTransactionSamples.length;
const passedTests = allResults.filter(r => r.passed).length + smsParser_test_1.nonTransactionSamples.length;
console.log("\n" + "=".repeat(60));
console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
console.log("=".repeat(60));
if (passedTests === totalTests) {
    console.log("✅ All tests passed!");
}
else {
    console.log(`❌ ${totalTests - passedTests} tests failed`);
    process.exit(1);
}
