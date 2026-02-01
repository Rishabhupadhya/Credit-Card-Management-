"use strict";
/**
 * ICICI Bank Email Parser
 *
 * Sample email formats:
 * Subject: "Alert: Card transaction for Rs 5,432.00"
 * Body: "Your ICICI Bank Credit Card ending 1234 has been used for Rs 5,432.00 at AMAZON..."
 *
 * Sender: alerts@icicibank.com, credit.cards@icicibank.com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IciciEmailParser = void 0;
class IciciEmailParser {
    getBankName() {
        return "ICICI";
    }
    canParse(email) {
        // Check sender domain
        const isIciciSender = /@icicibank\.com/i.test(email.from);
        // Check for credit card transaction keywords in subject or body
        const hasCreditCardKeywords = /credit\s*card/i.test(email.subject) ||
            /credit\s*card/i.test(email.body);
        const hasTransactionKeywords = /(debited|transaction|spent|used)/i.test(email.subject) ||
            /(debited|transaction|spent|used)/i.test(email.body);
        return isIciciSender && hasCreditCardKeywords && hasTransactionKeywords;
    }
    parse(email) {
        const body = email.body;
        // Filter out OTP emails
        if (/OTP|One.*Time.*Password|verification\s*code/i.test(body)) {
            return null;
        }
        // Filter out promotional/marketing emails
        if (/promotional|offer|cashback\s*offer|reward\s*points/i.test(email.subject)) {
            return null;
        }
        // Check for debit keywords
        if (!/debited|used|spent|transaction/i.test(body)) {
            return null;
        }
        try {
            // Extract amount
            // Patterns: "Rs 5,432.00", "Rs. 2,150", "INR 1,234.56"
            const amountMatch = body.match(/(?:Rs\.?\s*|INR\s*)([\d,]+\.?\d*)/i);
            if (!amountMatch)
                return null;
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
            // Extract masked card number (handle 'ending ####' and 'ending with ####')
            // Patterns: "ending 1234", "ending with 1234", "XX1234", "XXXX1234"
            const cardMatch = body.match(/ending\s*(?:with\s*)?(\d{4})|XX+(\d{4})/i);
            const maskedCardNumber = cardMatch ? (cardMatch[1] || cardMatch[2]) : undefined;
            // Extract merchant name
            // Pattern: "at AMAZON", "from SWIGGY", "merchant: FLIPKART"
            const merchantMatch = body.match(/(?:at|from|merchant:\s*)([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\s+dated|\.|$)/i);
            const merchantName = merchantMatch ? merchantMatch[1].trim() : "Unknown Merchant";
            // Extract transaction date
            // Patterns: "31-Jan-26", "31/01/2026", "31.01.26"
            const dateMatch = body.match(/(?:on|dated)\s*(\d{1,2})[-/.](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{2})[-/.](\d{2,4})/i);
            let transactionDate;
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const monthOrStr = dateMatch[2];
                const year = dateMatch[3].length === 2
                    ? 2000 + parseInt(dateMatch[3])
                    : parseInt(dateMatch[3]);
                if (/^\d+$/.test(monthOrStr)) {
                    // Numeric month
                    const month = parseInt(monthOrStr) - 1; // JS months are 0-indexed
                    transactionDate = new Date(year, month, day);
                }
                else {
                    // Month name (Jan, Feb, etc.)
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const month = monthNames.findIndex(m => m.toLowerCase() === monthOrStr.toLowerCase());
                    if (month >= 0) {
                        transactionDate = new Date(year, month, day);
                    }
                }
            }
            // Extract transaction time (if available)
            // Pattern: "14:30", "2:45 PM"
            const timeMatch = body.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
            let transactionTime;
            if (timeMatch) {
                transactionTime = timeMatch[0];
            }
            return {
                amount,
                transactionType: "DEBIT",
                merchantName,
                maskedCardNumber,
                transactionDate,
                transactionTime,
                bankName: "ICICI",
                emailSubject: email.subject,
                emailSender: email.from,
                emailDate: email.receivedDate,
                isValid: true
            };
        }
        catch (error) {
            console.error("Error parsing ICICI email:", error);
            return null;
        }
    }
}
exports.IciciEmailParser = IciciEmailParser;
