"use strict";
/**
 * HDFC Bank SMS Parser
 *
 * Sample SMS formats:
 * "Your HDFC Bank Credit Card ending 5678 is used for Rs.3,250.00 at ZOMATO on 31-01-26. Avl Lmt: Rs.96,750.00"
 * "HDFC Bank Credit Card XX9876 debited for INR 12,500.00 on 31/01/2026 at FLIPKART."
 * "Dear Customer, your HDFC Credit Card 5432 has been charged Rs 899.00 at NETFLIX on 31Jan26"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HdfcSmsParser = void 0;
class HdfcSmsParser {
    getBankName() {
        return "HDFC";
    }
    canParse(smsText) {
        return /HDFC\s*Bank/i.test(smsText) && /credit\s*card/i.test(smsText);
    }
    parse(smsText, receivedAt) {
        // Ignore non-transaction messages
        if (/OTP|verification|promotional|reversed|refund|credited/i.test(smsText)) {
            return null;
        }
        // Check for debit keywords
        if (!/used|debited|charged|spent/i.test(smsText)) {
            return null;
        }
        try {
            // Extract amount: Rs.3,250.00 or INR 12500.00
            const amountMatch = smsText.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
            if (!amountMatch)
                return null;
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
            // Extract masked card number: ending 5678 or XX9876 or 5432
            const cardMatch = smsText.match(/ending\s*(\d{4})|XX(\d{4})|card\s*(\d{4})/i);
            const maskedCardNumber = cardMatch ? (cardMatch[1] || cardMatch[2] || cardMatch[3]) : undefined;
            // Extract merchant name
            const merchantMatch = smsText.match(/(?:at|on)\s+([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\s+at|\.|$)/i);
            const merchantName = merchantMatch ? merchantMatch[1].trim() : "Unknown Merchant";
            // Extract date: 31-01-26 or 31/01/2026 or 31Jan26
            let transactionDate = receivedAt;
            const dateMatch = smsText.match(/(\d{1,2})[-/](\d{2}|[A-Za-z]{3})[-/](\d{2,4})/);
            if (dateMatch) {
                const [, day, monthOrNum, year] = dateMatch;
                const fullYear = year.length === 2 ? `20${year}` : year;
                // If month is number (01-12)
                if (/^\d{2}$/.test(monthOrNum)) {
                    transactionDate = new Date(`${fullYear}-${monthOrNum}-${day}`);
                }
                else {
                    // Month is text (Jan, Feb, etc.)
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
exports.HdfcSmsParser = HdfcSmsParser;
