"use strict";
/**
 * HDFC Bank Email Parser
 *
 * Sample email formats:
 * Subject: "Transaction Alert on your HDFC Bank Credit Card"
 * Body: "Your HDFC Bank Credit Card ending 5678 is used for Rs.3,250.00 at ZOMATO..."
 *
 * Sender: alerts@hdfcbank.net, creditcards@hdfcbank.com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HdfcEmailParser = void 0;
class HdfcEmailParser {
    getBankName() {
        return "HDFC";
    }
    canParse(email) {
        // Check sender domain
        const isHdfcSender = /@hdfcbank\.(com|net)/i.test(email.from);
        // Check for HDFC and credit card keywords
        const hasHdfcKeywords = /HDFC/i.test(email.subject) || /HDFC/i.test(email.body);
        const hasCreditCardKeywords = /credit\s*card/i.test(email.subject) || /credit\s*card/i.test(email.body);
        return isHdfcSender && hasHdfcKeywords && hasCreditCardKeywords;
    }
    parse(email) {
        // Normalize body: collapse whitespace, remove extra spaces
        let body = email.body.replace(/\s+/g, ' ').trim();
        // Filter out OTP and promotional emails
        if (/OTP|One.?Time.?Password|verify|password|promotional|cashback.*campaign|statement|reward.*points/i.test(body)) {
            return null;
        }
        // Check for transaction keywords - MUST have one of these verbs
        if (!/\b(spent|debited|charged|used|transaction)\b/i.test(body)) {
            return null;
        }
        try {
            // MANDATORY: Extract amount (Rs. or INR)
            // Patterns: "Rs.380.00", "Rs 380", "INR 380.00"
            const amountMatch = body.match(/(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i);
            if (!amountMatch) {
                return null; // No amount = not a transaction
            }
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
            if (isNaN(amount) || amount <= 0) {
                return null;
            }
            // Extract card number - multiple patterns
            // "ending 5712", "ending with 5712", "XX5712", "card 5712"
            const cardMatch = body.match(/(?:ending\s*(?:with)?|card)\s*(\d{4})|XX+(\d{4})/i);
            const maskedCardNumber = cardMatch ? (cardMatch[1] || cardMatch[2]) : undefined;
            // Extract merchant - HDFC specific patterns
            let merchantName = "Unknown Merchant";
            // Pattern 1: "towards MERCHANT on" (HDFC primary format)
            let merchantMatch = body.match(/towards\s+([A-Z][A-Z0-9\s&.',-]+?)(?:\s+on|\s+dated|\.|$)/i);
            if (merchantMatch) {
                merchantName = merchantMatch[1].trim();
            }
            else {
                // Pattern 2: "at MERCHANT on"
                merchantMatch = body.match(/\bat\s+([A-Z][A-Z0-9\s&.',-]+?)(?:\s+on|\s+dated|\s+at|\.|$)/i);
                if (merchantMatch) {
                    merchantName = merchantMatch[1].trim();
                }
            }
            // Clean up merchant name
            merchantName = merchantName.replace(/\s+/g, ' ').trim();
            // Extract date - multiple formats
            // "30 Jan, 2026", "30-01-26", "30/01/2026"
            const dateMatch = body.match(/(\d{1,2})\s*[-/.\s]\s*([\d]{1,2}|[A-Za-z]{3,})\s*,?\s*[-/.\s]?\s*(\d{2,4})|on\s+(\d{1,2})\s+([A-Za-z]{3})\s*,?\s*(\d{4})/i);
            let transactionDate;
            if (dateMatch) {
                let day, monthOrStr, year;
                if (dateMatch[4]) {
                    // Format: "on 30 Jan, 2026"
                    day = parseInt(dateMatch[4]);
                    monthOrStr = dateMatch[5];
                    year = parseInt(dateMatch[6]);
                }
                else {
                    // Format: "30-01-26" or "30 Jan 2026"
                    day = parseInt(dateMatch[1]);
                    monthOrStr = dateMatch[2];
                    year = dateMatch[3].length === 2
                        ? 2000 + parseInt(dateMatch[3])
                        : parseInt(dateMatch[3]);
                }
                if (/^\d+$/.test(monthOrStr)) {
                    const month = parseInt(monthOrStr) - 1;
                    transactionDate = new Date(year, month, day);
                }
                else {
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const month = monthNames.findIndex(m => monthOrStr.toLowerCase().startsWith(m.toLowerCase()));
                    if (month >= 0) {
                        transactionDate = new Date(year, month, day);
                    }
                }
            }
            // Extract time - "21:25:59", "9:30 PM", "14:30"
            const timeMatch = body.match(/\bat\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?/i);
            const transactionTime = timeMatch ? timeMatch[0].replace(/^at\s+/i, '') : undefined;
            return {
                amount,
                transactionType: "DEBIT",
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
            console.error("Error parsing HDFC email:", error);
            return null;
        }
    }
}
exports.HdfcEmailParser = HdfcEmailParser;
