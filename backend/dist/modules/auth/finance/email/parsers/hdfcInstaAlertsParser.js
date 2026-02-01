"use strict";
/**
 * HDFC Bank InstaAlerts UPI Email Parser
 *
 * Sample email formats:
 * Subject: "❗ You have done a UPI txn. Check details!"
 * Body: "You have done a UPI txn. Rs 110.00 debited from a/c **5241 on 29-01-26..."
 *
 * Sender: alerts@hdfcbank.net (HDFC Bank InstaAlerts)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HdfcInstaAlertsParser = void 0;
class HdfcInstaAlertsParser {
    getBankName() {
        return "HDFC";
    }
    canParse(email) {
        // Check sender - must be HDFC Bank InstaAlerts
        const isInstaAlerts = /HDFC Bank InstaAlerts.*alerts@hdfcbank\.net/i.test(email.from);
        // We only want CREDIT CARD debits (not bank account / debit-card alerts).
        // Many non-card alerts look like: "debited from a/c **1234".
        const mentionsCreditCard = /credit\s*card/i.test(email.subject) || /credit\s*card/i.test(email.body);
        const looksLikeAccountTxn = /\ba\/c\b|\baccount\b/i.test(email.subject) || /\ba\/c\b|\baccount\b/i.test(email.body);
        // Keep it permissive on keywords, but strict on being credit-card related.
        const hasTxnKeywords = /UPI txn|UPI transaction|debited|credited|withdrawn|transferred/i.test(email.subject) ||
            /UPI txn|UPI transaction|debited|credited|withdrawn|transferred/i.test(email.body);
        return isInstaAlerts && mentionsCreditCard && !looksLikeAccountTxn && hasTxnKeywords;
    }
    parse(email) {
        // Normalize body: collapse whitespace, remove extra spaces
        let body = email.body.replace(/\s+/g, ' ').trim();
        // Filter out OTP and promotional emails
        if (/OTP|One.?Time.?Password|verify your|password|promotional|cashback campaign/i.test(body)) {
            return null;
        }
        try {
            // MANDATORY: Extract amount (Rs. or INR)
            // Patterns: "Rs 110.00", "Rs. 110", "INR 110.00"
            const amountMatch = body.match(/Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i);
            if (!amountMatch) {
                return null; // No amount = not a transaction
            }
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
            if (isNaN(amount) || amount <= 0) {
                return null;
            }
            // Determine transaction type
            const transactionType = /credited|credit/i.test(body) ? "CREDIT" : "DEBIT";
            // Extract last4 for the CREDIT CARD
            // Patterns: "Credit Card **5712", "Credit Card ending 5712", "Card **5712"
            const cardMatch = body.match(/credit\s*card\s*\*+(\d{4})/i) ||
                body.match(/credit\s*card\s*ending\s*(\d{4})/i) ||
                body.match(/\bcard\b\s*\*+(\d{4})/i) ||
                body.match(/\bending\s*(?:with\s*)?(\d{4})\b/i);
            const maskedCardNumber = cardMatch ? cardMatch[1] : undefined;
            // Extract merchant/reference - UPI specific patterns
            let merchantName = "Unknown Merchant";
            // Pattern 1: "to VPA MERCHANT@bank" or "to MERCHANT@bank"
            let merchantMatch = body.match(/to\s+(?:VPA\s+)?([A-Za-z0-9._-]+@[A-Za-z0-9.-]+)/i);
            if (merchantMatch) {
                // Extract name from VPA (part before @)
                const vpa = merchantMatch[1];
                merchantName = vpa.split('@')[0].replace(/[._-]/g, ' ').trim();
            }
            else {
                // Pattern 2: "to MERCHANT NAME on"
                merchantMatch = body.match(/to\s+([A-Z][A-Za-z0-9\s&.',-]+?)(?:\s+on|\s+at|\s+dated|\.|$)/i);
                if (merchantMatch) {
                    merchantName = merchantMatch[1].trim();
                }
                else {
                    // Pattern 3: "from MERCHANT NAME to"
                    merchantMatch = body.match(/from\s+([A-Z][A-Za-z0-9\s&.',-]+?)(?:\s+to|\.|$)/i);
                    if (merchantMatch) {
                        merchantName = merchantMatch[1].trim();
                    }
                }
            }
            // Clean up merchant name
            merchantName = merchantName
                .replace(/\s+/g, ' ')
                .replace(/^(VPA|UPI)\s+/i, '')
                .trim();
            // Capitalize first letter of each word
            merchantName = merchantName
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            // Extract date - multiple formats
            // "29-01-26", "29/01/2026", "29 Jan 2026"
            const dateMatch = body.match(/on\s+(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/i);
            let transactionDate;
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]) - 1; // JavaScript months are 0-indexed
                let year = parseInt(dateMatch[3]);
                // Handle 2-digit year (26 -> 2026)
                if (year < 100) {
                    year = 2000 + year;
                }
                transactionDate = new Date(year, month, day);
                // Validate date
                if (isNaN(transactionDate.getTime())) {
                    transactionDate = undefined;
                }
            }
            // Extract time - "21:25:59", "14:30"
            const timeMatch = body.match(/at\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
            const transactionTime = timeMatch ? timeMatch[0].replace(/^at\s+/i, '') : undefined;
            return {
                amount,
                transactionType,
                merchantName,
                maskedCardNumber,
                transactionDate,
                transactionTime,
                bankName: "HDFC",
                emailSubject: email.subject,
                emailSender: email.from,
                emailDate: email.receivedDate,
                isValid: true
            };
        }
        catch (error) {
            console.error("Error parsing HDFC InstaAlerts email:", error);
            return null;
        }
    }
}
exports.HdfcInstaAlertsParser = HdfcInstaAlertsParser;
