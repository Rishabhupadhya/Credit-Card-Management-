"use strict";
/**
 * SBI (State Bank of India) Email Parser
 *
 * Sample email formats:
 * Subject: "SBI Card Alert - Transaction"
 * Body: "Your SBI Credit Card ending 3456 used for Rs 4,567.89 at AMAZON on 31/01/26..."
 *
 * Sender: sbicard@sbi.co.in, alerts@sbicard.com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SbiEmailParser = void 0;
class SbiEmailParser {
    getBankName() {
        return "SBI";
    }
    canParse(email) {
        // Check sender domain
        const isSbiSender = /@sbi(card)?\.(co\.in|com)/i.test(email.from);
        // Check for SBI keywords
        const hasSbiKeywords = /SBI|State\s*Bank/i.test(email.subject) ||
            /SBI|State\s*Bank/i.test(email.body);
        const hasCreditCardKeywords = /credit\s*card|card/i.test(email.subject) ||
            /credit\s*card|card/i.test(email.body);
        return isSbiSender && hasSbiKeywords && hasCreditCardKeywords;
    }
    parse(email) {
        // Normalize body: collapse whitespace, clean up
        let body = email.body.replace(/\s+/g, ' ').trim();
        // Filter out non-transaction emails
        if (/OTP|One.?Time.?Password|verify|password|promotional|reward.*points|statement|bill.*generated|flexipay.*emi/i.test(body)) {
            return null;
        }
        // MUST have transaction verb - expanded list
        if (!/\b(spent|debited|purchase|used|charged|transaction|payment|paid|withdrawn|credited|received)\b/i.test(body)) {
            return null;
        }
        try {
            // MANDATORY: Extract amount
            // "Rs.110.00 spent", "Rs 110 spent"
            const amountMatch = body.match(/(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i);
            if (!amountMatch) {
                console.log(`[SBI Parser] No amount found in: ${body.substring(0, 100)}`);
                return null;
            }
            const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
            if (isNaN(amount) || amount <= 0) {
                console.log(`[SBI Parser] Invalid amount: ${amountMatch[1]}`);
                return null;
            }
            // Extract card number - SBI uses "ending with ####"
            const cardMatch = body.match(/(?:ending\s*(?:with)?|card)\s*(\d{4})|XX+(\d{4})/i);
            const maskedCardNumber = cardMatch ? (cardMatch[1] || cardMatch[2]) : undefined;
            // Extract merchant - SBI format: "at MERCHANT on" or "at MERCHANT via" or "on MERCHANT"
            // "at BalajiBartanBhandar on", "at APOLLOPHARMACIESLIMIT on", "on POS MERCHANT"
            const merchantMatch = body.match(/\bat\s+([A-Z][A-Za-z0-9\s&.',-]+?)(?:\s+on|\s+via|\s+dated|\.|$)/i) ||
                body.match(/\bon\s+POS\s+([A-Z][A-Za-z0-9\s&.',-]+?)(?:\s+on|\s+dated|\.|$)/i) ||
                body.match(/\s+on\s+([A-Z][A-Za-z0-9\s&.',-]{3,})(?:\s+on|\s+dated|\.|$)/i);
            let merchantName = merchantMatch ? merchantMatch[1].trim() : "Unknown Merchant";
            // Clean up merchant name - remove "on" prefix/suffix and normalize whitespace
            merchantName = merchantName.replace(/^on\s+/i, '').replace(/\s+on$/i, '').replace(/\s+/g, ' ').trim();
            // Enhanced date parsing: "on 01-02-24", "on 31-Jan-26", "dated 01/02/2026"
            const dateMatch = body.match(/(?:on|dated)\s+(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/i) ||
                body.match(/(?:on|dated)\s+(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2,4})/i) ||
                body.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
            let transactionDate;
            if (dateMatch) {
                // Check if month is text (Jan, Feb, etc.)
                if (isNaN(parseInt(dateMatch[2]))) {
                    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                    const monthIndex = monthNames.indexOf(dateMatch[2].toLowerCase().substring(0, 3));
                    if (monthIndex !== -1) {
                        const day = parseInt(dateMatch[1]);
                        let year = parseInt(dateMatch[3]);
                        if (year < 100)
                            year = 2000 + year;
                        transactionDate = new Date(year, monthIndex, day);
                    }
                }
                else {
                    // SBI format is DD-MM-YY
                    const day = parseInt(dateMatch[1]);
                    const month = parseInt(dateMatch[2]) - 1; // 0-indexed
                    let year = parseInt(dateMatch[3]);
                    // Handle 2-digit year
                    if (year < 100) {
                        year = 2000 + year;
                    }
                    transactionDate = new Date(year, month, day);
                }
            }
            // Extract time - usually not in SBI emails
            const timeMatch = body.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
            const transactionTime = timeMatch ? timeMatch[0] : undefined;
            return {
                amount,
                transactionType: "DEBIT",
                merchantName,
                maskedCardNumber,
                transactionDate,
                transactionTime,
                bankName: "SBI",
                emailSubject: email.subject,
                emailSender: email.from,
                emailDate: email.receivedDate,
                isValid: true
            };
        }
        catch (error) {
            console.error("Error parsing SBI email:", error);
            return null;
        }
    }
}
exports.SbiEmailParser = SbiEmailParser;
