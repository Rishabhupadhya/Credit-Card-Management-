"use strict";
/**
 * SBI (State Bank of India) SMS Parser
 *
 * Sample SMS formats:
 * "Your SBI Credit Card XX3456 used for Rs 4,567.89 at AMAZON on 31/01/26. Available credit limit Rs 95,432.11"
 * "Dear Customer, Rs.6,780.00 debited from your SBI Card ending 7890 at MYNTRA on 31-Jan-2026"
 * "SBI Card XX1234: Purchase of INR 1,250.00 at UBER on 31.01.2026"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SbiSmsParser = void 0;
class SbiSmsParser {
    getBankName() {
        return "SBI";
    }
    canParse(smsText) {
        return (/SBI\s*(Credit\s*)?Card/i.test(smsText) ||
            /State\s*Bank.*Credit\s*Card/i.test(smsText));
    }
    parse(smsText, receivedAt) {
        // Filter out non-transaction messages
        if (/OTP|password|promotional|reversed|refund|credited/i.test(smsText)) {
            return null;
        }
        // Check for debit indicators
        if (!/used|debited|purchase|spent/i.test(smsText)) {
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
            const merchantMatch = smsText.match(/(?:at|from)\s+([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\s+at|\.|$)/i);
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
exports.SbiSmsParser = SbiSmsParser;
