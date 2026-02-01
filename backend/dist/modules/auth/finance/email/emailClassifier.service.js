"use strict";
/**
 * Email Classifier Service
 *
 * Classifies emails using metadata (from, subject, snippet) before full body parsing.
 * This reduces parsing complexity and improves performance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.needsFullBodyParse = exports.quickExtractFromSnippet = exports.classifyEmail = exports.EmailCategory = void 0;
const logger_1 = require("../../../../utils/logger");
var EmailCategory;
(function (EmailCategory) {
    EmailCategory["TRANSACTION"] = "TRANSACTION";
    EmailCategory["OTP"] = "OTP";
    EmailCategory["PROMOTION"] = "PROMOTION";
    EmailCategory["STATEMENT"] = "STATEMENT";
    EmailCategory["UNKNOWN"] = "UNKNOWN";
})(EmailCategory || (exports.EmailCategory = EmailCategory = {}));
/**
 * Bank sender patterns for quick classification
 */
const BANK_PATTERNS = {
    ICICI: /@icicibank\.com/i,
    HDFC: /@hdfcbank\.(com|net)|@hdfcbank|alerts@hdfcbank/i,
    SBI: /@sbi(card)?\.(co\.in|com)|@sbicard\.|sbi.*card|reliance.*sbi/i,
    Axis: /@axisbank(mail)?\.com/i,
    Kotak: /@kotak\.com/i,
    // Add more banks
    IDFC: /@idfcfirstbank\.com/i,
    Yes: /@yesbank\.in/i,
    IndusInd: /@indusind\.com/i,
    Standard: /@sc\.com/i
};
/**
 * Transaction verbs for quick detection
 */
const TRANSACTION_VERBS = [
    "debited",
    "spent",
    "charged",
    "used",
    "transaction",
    "purchase",
    "credited",
    "received",
    "txn",
    "paid",
    "payment",
    "withdrawn",
    "transferred",
    "transfer"
];
/**
 * OTP/Verification keywords
 */
const OTP_KEYWORDS = [
    "OTP",
    "One Time Password",
    "One-Time Password",
    "verification code",
    "verify",
    "authentication",
    "security code"
];
/**
 * Promotional keywords
 */
const PROMOTION_KEYWORDS = [
    "offer",
    "cashback campaign",
    "reward points",
    "special offer",
    "limited time",
    "discount",
    "voucher",
    "gift"
];
/**
 * Statement keywords
 */
const STATEMENT_KEYWORDS = [
    "statement",
    "bill generated",
    "payment due",
    "minimum due",
    "outstanding"
];
/**
 * Classify email using metadata first
 */
const classifyEmail = (email) => {
    const { from, subject, snippet = "" } = email;
    // Combine subject and snippet for classification
    const metadata = `${subject} ${snippet}`.toLowerCase();
    // Detect bank
    let bankName;
    for (const [bank, pattern] of Object.entries(BANK_PATTERNS)) {
        if (pattern.test(from)) {
            bankName = bank;
            break;
        }
    }
    // Quick checks on metadata
    const hasAmount = /(?:Rs\.?|INR)\s*[\d,]+(?:\.\d{1,2})?/i.test(metadata);
    const hasTransactionVerb = TRANSACTION_VERBS.some(verb => metadata.includes(verb.toLowerCase()));
    const hasCardNumber = /(?:ending|card)\s*(?:with)?\s*\d{4}|XX+\d{4}/i.test(metadata);
    // Classification logic
    let category;
    let confidence;
    // Check OTP first (highest priority to exclude)
    if (OTP_KEYWORDS.some(kw => metadata.includes(kw.toLowerCase()))) {
        category = EmailCategory.OTP;
        confidence = 0.95;
    }
    // Check Promotion (exclude promotional emails)
    else if (PROMOTION_KEYWORDS.some(kw => metadata.includes(kw.toLowerCase()))) {
        category = EmailCategory.PROMOTION;
        confidence = 0.85;
    }
    // Check Transaction - MORE LENIENT: amount OR verb is enough from a bank
    else if (bankName && (hasAmount || hasTransactionVerb || hasCardNumber)) {
        category = EmailCategory.TRANSACTION;
        // Higher confidence if we have multiple signals
        if (hasAmount && hasTransactionVerb) {
            confidence = hasCardNumber ? 0.95 : 0.85;
        }
        else {
            confidence = 0.70; // Lower confidence but still worth trying to parse
        }
    }
    // Check Statement keywords
    else if (STATEMENT_KEYWORDS.some(kw => metadata.includes(kw.toLowerCase()))) {
        category = EmailCategory.STATEMENT;
        confidence = 0.90;
    }
    // VERY LENIENT: If from a bank but didn't match above, try as transaction with low confidence
    else if (bankName) {
        category = EmailCategory.TRANSACTION;
        confidence = 0.50; // Very low confidence, but attempt parsing anyway
    }
    // Unknown (only for non-bank emails)
    else {
        category = EmailCategory.UNKNOWN;
        confidence = 0;
    }
    return {
        category,
        confidence,
        bankName,
        metadata: {
            hasAmount,
            hasTransactionVerb,
            hasCardNumber,
            snippet
        }
    };
};
exports.classifyEmail = classifyEmail;
const quickExtractFromSnippet = (snippet, subject) => {
    const combined = `${subject} ${snippet}`;
    let amount;
    let cardLast4;
    let merchant;
    let confidence = 0;
    // Extract amount
    const amountMatch = combined.match(/(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ""));
        confidence += 0.4;
    }
    // Extract card number
    const cardMatch = combined.match(/(?:ending|card)\s*(?:with)?\s*(\d{4})|XX+(\d{4})/i);
    if (cardMatch) {
        cardLast4 = cardMatch[1] || cardMatch[2];
        confidence += 0.3;
    }
    // Extract merchant (basic pattern)
    const merchantMatch = combined.match(/(?:at|towards)\s+([A-Z][A-Za-z0-9\s&]{3,30}?)(?:\s+on|\.|$)/);
    if (merchantMatch) {
        merchant = merchantMatch[1].trim();
        confidence += 0.3;
    }
    return {
        amount,
        cardLast4,
        merchant,
        confidence: Math.min(confidence, 1.0)
    };
};
exports.quickExtractFromSnippet = quickExtractFromSnippet;
/**
 * Decide if full body parsing is needed
 */
const needsFullBodyParse = (classification, quickExtract) => {
    // Skip full parse for OTP, Promotion, Statement
    if ([EmailCategory.OTP, EmailCategory.PROMOTION, EmailCategory.STATEMENT].includes(classification.category)) {
        logger_1.logger.info(`[Classifier] Skipping full parse: ${classification.category}`);
        return false;
    }
    // Skip if not a transaction
    if (classification.category !== EmailCategory.TRANSACTION) {
        logger_1.logger.info(`[Classifier] Not a transaction email (${classification.category})`);
        return false;
    }
    // Parse if low confidence
    if (classification.confidence < 0.75) {
        logger_1.logger.info(`[Classifier] Low confidence (${classification.confidence}), full parse needed`);
        return true;
    }
    // Parse if quick extraction was incomplete
    if (!quickExtract.amount) {
        logger_1.logger.info(`[Classifier] Missing amount in snippet, full parse needed`);
        return true;
    }
    // Skip full parse if snippet had enough data
    if (quickExtract.confidence >= 0.7) {
        logger_1.logger.info(`[Classifier] High confidence snippet extraction (${quickExtract.confidence}), skipping full parse`);
        return false;
    }
    // Default: full parse needed
    return true;
};
exports.needsFullBodyParse = needsFullBodyParse;
