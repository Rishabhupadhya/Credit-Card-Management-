"use strict";
/**
 * Axis Bank SMS Parser
 *
 * Sample SMS formats:
 * "Your Axis Bank Credit Card XX2345 is debited with Rs.8,900.50 for a transaction at SWIGGY on 31-Jan-26"
 * "Dear Customer, INR 3,450.00 spent on Axis Credit Card ending 6789 at BIGBASKET on 31/01/2026"
 * "Axis Bank: Your Card 4321 charged Rs 2,100.00 at BOOKMYSHOW on 31.01.26"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AxisSmsParser = void 0;
class AxisSmsParser {
    getBankName() {
        return "Axis";
    }
    canParse(smsText) {
        return /Axis\s*Bank/i.test(smsText) && /credit\s*card|card/i.test(smsText);
    }
    parse(smsText, receivedAt) {
        // Filter non-transaction messages
        if (/OTP|One-Time|promotional|reversed|refund|credited/i.test(smsText)) {
            return null;
        }
        // Check for debit keywords
        if (!/debited|spent|charged|used|transaction/i.test(smsText)) {
            return null;
        }
        try {
            // Extract amount
            const amountMatch = smsText.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
            if (!amountMatch)
                return null;
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
            // Extract card number
            const cardMatch = smsText.match(/XX(\d{4})|ending\s*(\d{4})|card\s*(\d{4})/i);
            const maskedCardNumber = cardMatch ? (cardMatch[1] || cardMatch[2] || cardMatch[3]) : undefined;
            // Extract merchant
            const merchantMatch = smsText.match(/(?:at|for\s+a\s+transaction\s+at)\s+([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\s+at|\.|$)/i);
            const merchantName = merchantMatch ? merchantMatch[1].trim() : "Unknown Merchant";
            // Extract date
            let transactionDate = receivedAt;
            const dateMatch = smsText.match(/(\d{1,2})[-/.](\d{2}|[A-Za-z]{3})[-/.](\d{2,4})/);
            if (dateMatch) {
                const [, day, monthOrNum, year] = dateMatch;
                const fullYear = year.length === 2 ? `20${year}` : year;
                if (/^\d{2}$/.test(monthOrNum)) {
                    transactionDate = new Date(`${fullYear}-${monthOrNum}-${day}`);
                }
                else {
                    transactionDate = new Date(`${day} ${monthOrNum} ${fullYear}`);
                }
            }
            return {
                amount,
                transactionType: "DEBIT",
                merchantName,
                maskedCardNumber,
                transactionDate,
                bankName: this.getBankName(),
                rawSms: smsText,
                isValid: true
            };
        }
        catch (error) {
            return null;
        }
    }
}
exports.AxisSmsParser = AxisSmsParser;
