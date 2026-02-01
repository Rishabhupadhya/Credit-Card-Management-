"use strict";
/**
 * Email Fetcher Service
 *
 * Fetches transaction alert emails from Gmail/Outlook using OAuth access.
 * Filters emails by sender domain and subject keywords.
 *
 * IMPORTANT: This module requires googleapis or @microsoft/microsoft-graph-client
 * Install: npm install googleapis @microsoft/microsoft-graph-client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOutlookEmails = exports.fetchGmailEmails = void 0;
const logger_1 = require("../../../../utils/logger");
const imageOcr_service_1 = require("./imageOcr.service");
/**
 * Bank email sender domains to filter
 * Only fetch emails from these trusted domains
 */
const BANK_SENDER_DOMAINS = [
    "@icicibank.com",
    "@hdfcbank.com",
    "@hdfcbank.net",
    "@sbi.co.in",
    "@sbicard.com",
    "@axisbank.com",
    "@kotakbank.com",
    "@indusind.com",
    "@yesbank.in"
];
/**
 * Subject keywords to filter transaction emails
 * Avoid OTP, promotional, marketing emails
 */
const TRANSACTION_KEYWORDS = [
    "transaction",
    "alert",
    "spent",
    "debited",
    "used",
    "purchase",
    "charged",
    "credit card"
];
/**
 * Keywords to EXCLUDE (OTP, marketing, etc.)
 * Keep minimal to avoid filtering valid transactions
 */
const EXCLUDED_KEYWORDS = [
    "OTP",
    "One Time Password",
    "verification code"
];
/**
 * Fetch emails from Gmail
 *
 * NOTE: Requires googleapis library
 * Install: npm install googleapis
 *
 * @param accessToken OAuth access token
 * @param daysBack Number of days to fetch (default: 7)
 * @returns Array of raw email data
 */
const fetchGmailEmails = async (accessToken, daysBack = 7) => {
    logger_1.logger.info(`[fetchGmailEmails] START - Fetching Gmail emails from last ${daysBack} days`);
    try {
        const { google } = require('googleapis');
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        const gmail = google.gmail({ version: 'v1', auth });
        // Build query to filter emails
        const query = buildGmailQuery(daysBack);
        logger_1.logger.info(`Gmail query: ${query}`);
        // Fetch messages with pagination to get ALL results (no limit)
        const allMessages = [];
        let pageToken = undefined;
        let pageCount = 0;
        do {
            const response = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 100,
                pageToken
            });
            const messages = response.data.messages || [];
            allMessages.push(...messages);
            pageToken = response.data.nextPageToken;
            pageCount++;
            logger_1.logger.info(`Fetched page ${pageCount}: ${messages.length} messages (total so far: ${allMessages.length})`);
        } while (pageToken);
        logger_1.logger.info(`Found ${allMessages.length} messages matching query across ${pageCount} pages`);
        logger_1.logger.info(`Found ${allMessages.length} messages matching query across ${pageCount} pages`);
        if (allMessages.length === 0) {
            logger_1.logger.warn('No messages found. Check if:');
            logger_1.logger.warn('1. Your bank emails are from the configured sender domains');
            logger_1.logger.warn('2. Subject lines contain transaction keywords');
            logger_1.logger.warn('3. Emails are within the date range');
            return [];
        }
        const emails = [];
        for (const message of allMessages) {
            try {
                const detail = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full'
                });
                const parsed = await parseGmailMessage(detail.data, gmail);
                if (parsed) {
                    // Log the date of each fetched email
                    const emailDate = new Date(parsed.receivedDate).toISOString().split('T')[0];
                    logger_1.logger.info(`Fetched email from ${emailDate}: ${parsed.subject.substring(0, 60)}`);
                    emails.push(parsed);
                }
            }
            catch (err) {
                logger_1.logger.error(`Failed to fetch message ${message.id}:`, err);
            }
        }
        logger_1.logger.info(`Successfully parsed ${emails.length} emails`);
        return emails;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch Gmail emails:', error);
        throw new Error(`Gmail API error: ${error.message}`);
    }
};
exports.fetchGmailEmails = fetchGmailEmails;
/**
 * Fetch emails from Outlook
 *
 * NOTE: Requires Microsoft Graph client
 * Install: npm install @microsoft/microsoft-graph-client
 *
 * @param accessToken OAuth access token
 * @param daysBack Number of days to fetch (default: 7)
 * @returns Array of raw email data
 */
const fetchOutlookEmails = async (accessToken, daysBack = 7) => {
    logger_1.logger.info(`Fetching Outlook emails from last ${daysBack} days`);
    try {
        const { Client } = require('@microsoft/microsoft-graph-client');
        const client = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        // Build filter for bank emails
        const senderFilter = BANK_SENDER_DOMAINS.map(domain => `contains(from/emailAddress/address, '${domain}')`).join(' or ');
        const response = await client
            .api('/me/messages')
            .filter(`(${senderFilter}) and receivedDateTime ge ${startDate.toISOString()}`)
            .select('id,subject,from,receivedDateTime,body,bodyPreview')
            .top(100)
            .get();
        const emails = response.value
            .map(parseOutlookMessage)
            .filter((email) => {
            // Filter by keywords
            const hasKeyword = TRANSACTION_KEYWORDS.some(kw => email.subject.toLowerCase().includes(kw.toLowerCase()));
            const hasExcluded = EXCLUDED_KEYWORDS.some(kw => email.subject.toLowerCase().includes(kw.toLowerCase()));
            return hasKeyword && !hasExcluded;
        });
        logger_1.logger.info(`Successfully parsed ${emails.length} Outlook emails`);
        return emails;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch Outlook emails:', error);
        throw new Error(`Outlook API error: ${error.message}`);
    }
};
exports.fetchOutlookEmails = fetchOutlookEmails;
/**
 * Build Gmail query string
 * Filters by sender domain, subject keywords, and date
 */
const buildGmailQuery = (daysBack) => {
    const afterDate = new Date();
    // Gmail's "after:" is exclusive, so add 1 day to include the full range
    // E.g., for 30 days: we want Jan 2 onwards, so use "after:Jan 1"
    afterDate.setDate(afterDate.getDate() - daysBack - 1);
    const afterDateStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
    logger_1.logger.info(`[buildGmailQuery] Building query with daysBack=${daysBack}, afterDate=${afterDateStr} (inclusive range)`);
    // Build query components
    const senderQuery = BANK_SENDER_DOMAINS.map(domain => `from:*${domain}`).join(" OR ");
    const excludeQuery = EXCLUDED_KEYWORDS.map(kw => `-subject:"${kw}"`).join(" ");
    // SIMPLIFIED: Only filter by sender and exclude OTPs - let classifier handle the rest
    // This ensures we get ALL bank emails, not just ones with specific subject keywords
    const fullQuery = `in:anywhere (${senderQuery}) ${excludeQuery} after:${afterDateStr}`;
    logger_1.logger.info(`[buildGmailQuery] Full query: ${fullQuery}`);
    return fullQuery;
};
/**
 * Parse Gmail message to RawEmailData format
 * Extracts text body AND performs OCR on embedded images
 */
const parseGmailMessage = async (message, gmail) => {
    const headers = message.payload.headers;
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const date = headers.find((h) => h.name === "Date")?.value || "";
    // Extract body (handle multipart, fallback to HTML if no text/plain)
    let body = "";
    let bodyType = "none";
    const images = [];
    // Helper function to recursively find body and images in nested parts
    const findBodyAndImages = (parts) => {
        let foundBody = null;
        for (const part of parts) {
            // Extract images (inline or attachments)
            if ((0, imageOcr_service_1.isImagePart)(part.mimeType)) {
                if (part.body?.attachmentId) {
                    // Store attachment ID to fetch later
                    images.push({
                        data: '',
                        mimeType: part.mimeType,
                        attachmentId: part.body.attachmentId
                    });
                    logger_1.logger.info(`Found image attachment: ${part.mimeType} (ID: ${part.body.attachmentId.substring(0, 8)})`);
                }
                else if (part.body?.data) {
                    // Inline image data
                    images.push({
                        data: part.body.data,
                        mimeType: part.mimeType
                    });
                    logger_1.logger.info(`Found inline image: ${part.mimeType}`);
                }
            }
            // Check if this part has text body
            if (!foundBody && part.mimeType === "text/plain" && part.body?.data) {
                foundBody = {
                    body: Buffer.from(part.body.data, "base64").toString("utf-8"),
                    type: "text/plain"
                };
            }
            // Check nested parts (for multipart/alternative, multipart/mixed, etc.)
            if (part.parts && Array.isArray(part.parts)) {
                const nested = findBodyAndImages(part.parts);
                if (nested && !foundBody) {
                    foundBody = nested;
                }
            }
        }
        // Second pass: try HTML if no plain text found
        if (!foundBody) {
            for (const part of parts) {
                if (part.mimeType === "text/html" && part.body?.data) {
                    const htmlBody = Buffer.from(part.body.data, "base64").toString("utf-8");
                    foundBody = {
                        body: htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
                        type: "text/html"
                    };
                    break;
                }
                // Check nested parts for HTML
                if (part.parts && Array.isArray(part.parts)) {
                    const nested = findBodyAndImages(part.parts);
                    if (nested) {
                        foundBody = nested;
                        break;
                    }
                }
            }
        }
        return foundBody;
    };
    if (message.payload.body.data) {
        body = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
        bodyType = "direct";
    }
    else if (message.payload.parts) {
        const result = findBodyAndImages(message.payload.parts);
        if (result) {
            body = result.body;
            bodyType = result.type;
            if (result.type === "text/html") {
                logger_1.logger.info(`Stripped HTML email (ID: ${message.id.substring(0, 8)}), body length: ${body.length}`);
            }
        }
        else {
            logger_1.logger.warn(`No body found for email (ID: ${message.id.substring(0, 8)})`);
        }
    }
    // Fetch attachment data for images
    for (const img of images.filter(i => i.attachmentId)) {
        try {
            const attachment = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: message.id,
                id: img.attachmentId
            });
            img.data = attachment.data.data;
            logger_1.logger.info(`Fetched attachment data: ${img.attachmentId?.substring(0, 8)}, size: ${img.data.length}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to fetch attachment ${img.attachmentId}: ${error.message}`);
        }
    }
    // Perform OCR on images to extract transaction details
    let ocrText = '';
    if (images.length > 0) {
        logger_1.logger.info(`Found ${images.length} image(s) in email, performing OCR...`);
        const validImages = images.filter(img => img.data);
        ocrText = await (0, imageOcr_service_1.extractTextFromImages)(validImages);
        if (ocrText.length > 0) {
            logger_1.logger.info(`OCR extracted ${ocrText.length} characters from images`);
            // Combine text body with OCR text
            body = body ? `${body}\n\n[OCR FROM IMAGES]\n${ocrText}` : ocrText;
        }
        else {
            logger_1.logger.warn(`OCR found no text in ${images.length} image(s)`);
        }
    }
    return {
        messageId: message.id,
        subject,
        from,
        body,
        receivedDate: new Date(date),
        snippet: message.snippet
    };
};
/**
 * Parse Outlook message to RawEmailData format
 */
const parseOutlookMessage = (message) => {
    return {
        messageId: message.id,
        subject: message.subject,
        from: message.from.emailAddress.address,
        body: message.body.content, // HTML or text
        receivedDate: new Date(message.receivedDateTime),
        snippet: message.bodyPreview
    };
};
/**
 * Mock Gmail emails for development/testing
 */
const mockGmailEmails = () => {
    return [
        {
            messageId: "gmail-msg-001",
            subject: "Alert: Card transaction for Rs 5,432.00",
            from: "alerts@icicibank.com",
            body: "Your ICICI Bank Credit Card ending 1234 has been used for Rs 5,432.00 at AMAZON on 31-Jan-26 at 14:30. Available balance: Rs 89,568.00",
            receivedDate: new Date("2026-01-31T14:30:00Z"),
            snippet: "Your ICICI Bank Credit Card ending 1234 has been used for Rs 5,432.00..."
        },
        {
            messageId: "gmail-msg-002",
            subject: "Transaction Alert on your HDFC Bank Credit Card",
            from: "alerts@hdfcbank.com",
            body: "Your HDFC Bank Credit Card ending 5678 is used for Rs.3,250.00 at ZOMATO on 31-01-26 at 19:45. Available limit: Rs.96,750.00",
            receivedDate: new Date("2026-01-31T19:45:00Z"),
            snippet: "Your HDFC Bank Credit Card ending 5678 is used for Rs.3,250.00..."
        }
    ];
};
/**
 * Mock Outlook emails for development/testing
 */
const mockOutlookEmails = () => {
    return [
        {
            messageId: "outlook-msg-001",
            subject: "SBI Card Alert - Transaction",
            from: "alerts@sbicard.com",
            body: "Your SBI Credit Card ending 3456 used for Rs 4,567.89 at FLIPKART on 31/01/26 at 10:15. Available credit limit Rs 95,432.11",
            receivedDate: new Date("2026-01-31T10:15:00Z"),
            snippet: "Your SBI Credit Card ending 3456 used for Rs 4,567.89..."
        }
    ];
};
