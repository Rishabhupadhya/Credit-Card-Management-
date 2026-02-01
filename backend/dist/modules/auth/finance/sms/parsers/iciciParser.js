"use strict";
/**
 * ICICI Bank SMS Parser
 *
 * Sample SMS formats:
 * "Your ICICI Bank Credit Card XX1234 has been debited with INR 5,432.00 on 31-Jan-26 at AMAZON. Avbl bal: INR 89,568.00"
 * "Your Credit Card XX4567 has been used for INR 2,150.00 at SWIGGY on 31-Jan-2026. Available limit: 97,850.00"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IciciSmsParser = void 0;
class IciciSmsParser {
    getBankName() {
        return "ICICI";
    }
    canParse(smsText) {
        // Check for ICICI Bank identifiers
        return /ICICI\s*Bank/i.test(smsText) && /credit\s*card/i.test(smsText);
    }
    parse(smsText, receivedAt) {
        // Ignore OTP, promotional, and reversal messages
        if (/OTP|One.*Time.*Password|promotional|reversed|refund/i.test(smsText)) {
            return null;
        }
        // Check if it's a debit transaction
        if (!/debited|used|spent/i.test(smsText)) {
            return null;
        }
        try {
            // Extract amount: INR 5,432.00 or Rs. 5432.00
            const amountMatch = smsText.match(/(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i);
            if (!amountMatch)
                return null;
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
            // Extract masked card number: XX1234 or ending 1234
            const cardMatch = smsText.match(/XX(\d{4})|ending\s*(\d{4})|card\s*(\d{4})/i);
            const maskedCardNumber = cardMatch ? (cardMatch[1] || cardMatch[2] || cardMatch[3]) : undefined;
            // Extract merchant name: "at AMAZON" or "on SWIGGY"
            const merchantMatch = smsText.match(/(?:at|on)\s+([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\s+at|\.|\s+Avbl|\s+Available|$)/i);
            const merchantName = merchantMatch ? merchantMatch[1].trim() : "Unknown Merchant";
            // Extract transaction date: 31-Jan-26 or 31-Jan-2026
            let transactionDate = receivedAt;
            const dateMatch = smsText.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
            if (dateMatch) {
                const [, day, month, year] = dateMatch;
                const fullYear = year.length === 2 ? `20${year}` : year;
                transactionDate = new Date(`${day} ${month} ${fullYear}`);
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
exports.IciciSmsParser = IciciSmsParser;
