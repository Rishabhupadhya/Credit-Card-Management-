"use strict";
/**
 * Generic Email Parser (Fallback)
 *
 * Used when bank-specific parser is not available.
 * Attempts to extract transaction details using common patterns.
 *
 * Will work with most banks that follow standard formats like:
 * - "Your [Bank] Credit Card ending XXXX used for Rs AMOUNT at MERCHANT on DATE"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericEmailParser = void 0;
class GenericEmailParser {
    getBankName() {
        return "Generic";
    }
    canParse(email) {
        // Generic parser can attempt to parse any email that looks like a transaction
        const hasCreditCardKeywords = /credit\s*card/i.test(email.subject) ||
            /credit\s*card/i.test(email.body);
        const hasTransactionKeywords = /(debited|transaction|spent|used|charged|purchase)/i.test(email.body);
        const hasAmount = /(?:Rs\.?\s*|INR\s*)([\d,]+\.?\d*)/i.test(email.body);
        return hasCreditCardKeywords && hasTransactionKeywords && hasAmount;
    }
    parse(email) {
        const body = email.body;
        // Filter out OTP and promotional emails
        if (/OTP|One.*Time.*Password|verification|promotional|offer|cashback\s*campaign/i.test(body)) {
            return null;
        }
        try {
            // Extract amount (universal pattern)
            const amountMatch = body.match(/(?:Rs\.?\s*|INR\s*)([\d,]+\.?\d*)/i);
            if (!amountMatch)
                return null;
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
            // Extract card number (universal pattern)
            const cardMatch = body.match(/(?:ending|last|XX+)\s*(\d{4})/i);
            const maskedCardNumber = cardMatch ? cardMatch[1] : undefined;
            // Extract merchant (look for common patterns)
            let merchantName = "Unknown Merchant";
            const merchantPatterns = [
                /(?:at|from|merchant:\s*)([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\s+dated|\s+for|\.|$)/i,
                /(?:transaction\s+at)\s+([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\.|$)/i,
                /(?:purchase\s+from)\s+([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\.|$)/i
            ];
            for (const pattern of merchantPatterns) {
                const match = body.match(pattern);
                if (match) {
                    merchantName = match[1].trim();
                    break;
                }
            }
            // Extract bank name from sender or body
            let bankName = "Unknown";
            const bankPatterns = [
                { regex: /(ICICI|HDFC|SBI|State\s*Bank|Axis|Kotak|IndusInd)/i, name: "$1" },
            ];
            for (const pattern of bankPatterns) {
                const match = (email.from + " " + body).match(pattern.regex);
                if (match) {
                    bankName = match[1].toUpperCase();
                    break;
                }
            }
            // Extract date
            const dateMatch = body.match(/(\d{1,2})[-/.](\d{2}|[A-Za-z]{3})[-/.](\d{2,4})/);
            let transactionDate;
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const monthOrStr = dateMatch[2];
                const year = dateMatch[3].length === 2
                    ? 2000 + parseInt(dateMatch[3])
                    : parseInt(dateMatch[3]);
                if (/^\d+$/.test(monthOrStr)) {
                    const month = parseInt(monthOrStr) - 1;
                    transactionDate = new Date(year, month, day);
                }
                else {
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const month = monthNames.findIndex(m => m.toLowerCase() === monthOrStr.toLowerCase());
                    if (month >= 0) {
                        transactionDate = new Date(year, month, day);
                    }
                }
            }
            // Extract time
            const timeMatch = body.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
            const transactionTime = timeMatch ? timeMatch[0] : undefined;
            return {
                amount,
                transactionType: "DEBIT",
                merchantName,
                maskedCardNumber,
                transactionDate,
                transactionTime,
                bankName,
                emailSubject: email.subject,
                emailSender: email.from,
                emailDate: email.receivedDate,
                isValid: true
            };
        }
        catch (error) {
            console.error("Error parsing email with generic parser:", error);
            return null;
        }
    }
}
exports.GenericEmailParser = GenericEmailParser;
