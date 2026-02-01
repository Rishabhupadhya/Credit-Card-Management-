"use strict";
/**
 * Axis Bank Email Parser
 *
 * Sample email formats:
 * Subject: "Axis Bank Credit Card - Transaction Alert"
 * Body: "Your Axis Bank Credit Card ending 2345 is debited with Rs.8,900.50 at SWIGGY..."
 *
 * Sender: alerts@axisbank.com, creditcard@axisbank.com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AxisEmailParser = void 0;
class AxisEmailParser {
    getBankName() {
        return "Axis";
    }
    canParse(email) {
        // Check sender domain
        const isAxisSender = /@axisbank\.com/i.test(email.from);
        // Check for Axis keywords
        const hasAxisKeywords = /Axis\s*Bank/i.test(email.subject) ||
            /Axis\s*Bank/i.test(email.body);
        const hasCreditCardKeywords = /credit\s*card|card/i.test(email.subject) ||
            /credit\s*card|card/i.test(email.body);
        return isAxisSender && hasAxisKeywords && hasCreditCardKeywords;
    }
    parse(email) {
        const body = email.body;
        // Filter out OTP and promotional emails
        if (/OTP|One-Time|promotional|special\s*offer/i.test(body)) {
            return null;
        }
        // Check for transaction keywords
        if (!/debited|spent|charged|transaction/i.test(body)) {
            return null;
        }
        try {
            // Extract amount (handle structured format)
            let amountMatch = body.match(/Amount\s+Debited:\s*(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
            if (!amountMatch) {
                // Fallback to general pattern
                amountMatch = body.match(/(?:Rs\.?\s*|INR\s*)([\d,]+\.?\d*)/i);
            }
            if (!amountMatch)
                return null;
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
            // Extract card number (handle account number format and 'ending with ####')
            let cardMatch = body.match(/Account\s+Number:\s*XX+(\d{4})/i);
            if (!cardMatch) {
                // Fallback to general patterns (including 'ending with ####')
                cardMatch = body.match(/ending\s*(?:with\s*)?(\d{4})|XX+(\d{4})|card\s*(\d{4})/i);
            }
            const maskedCardNumber = cardMatch ? (cardMatch[1] || cardMatch[2] || cardMatch[3]) : undefined;
            // Extract merchant (handle multiple formats)
            let merchantName = "Unknown Merchant";
            // Format 1: "Transaction Info: UPI/P2M/.../MERCHANT" (UPI transactions)
            let merchantMatch = body.match(/Transaction\s+Info:\s+UPI\/[^\/]+\/[^\/]+\/([A-Z][A-Z0-9\s&.-]+)/i);
            if (merchantMatch) {
                merchantName = merchantMatch[1].trim();
            }
            else {
                // Format 2: "at MERCHANT" (card transactions)
                merchantMatch = body.match(/(?:at|for\s+a\s+transaction\s+at)\s+([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\s+dated|\.|$)/i);
                if (merchantMatch) {
                    merchantName = merchantMatch[1].trim();
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
            // Extract time (handle IST timezone)
            let timeMatch = body.match(/Date\s+&\s+Time:\s*\d{2}-\d{2}-\d{2},\s+(\d{1,2}:\d{2}:\d{2})\s*IST/i);
            let transactionTime;
            if (timeMatch) {
                transactionTime = timeMatch[1];
            }
            else {
                // Fallback to general time pattern
                const generalTimeMatch = body.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|IST))?/i);
                transactionTime = generalTimeMatch ? generalTimeMatch[0] : undefined;
            }
            return {
                amount,
                transactionType: "DEBIT",
                merchantName,
                maskedCardNumber,
                transactionTime,
                transactionDate,
                bankName: "Axis",
                emailSubject: email.subject,
                emailSender: email.from,
                emailDate: email.receivedDate,
                isValid: true
            };
        }
        catch (error) {
            console.error("Error parsing Axis email:", error);
            return null;
        }
    }
}
exports.AxisEmailParser = AxisEmailParser;
