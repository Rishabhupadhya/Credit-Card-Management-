"use strict";
/**
 * Image OCR Service
 *
 * Extracts text from images embedded in bank transaction emails using Tesseract.js
 * Many Indian banks send transaction details as images to prevent text scraping
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isImagePart = exports.extractTextFromImages = exports.extractTextFromImage = void 0;
const tesseract_js_1 = require("tesseract.js");
const logger_1 = require("../../../../utils/logger");
/**
 * Extract text from a base64 encoded image using OCR
 *
 * @param imageData Base64 encoded image data
 * @param mimeType Image MIME type (e.g., 'image/png', 'image/jpeg')
 * @returns Extracted text from the image
 */
const extractTextFromImage = async (imageData, mimeType) => {
    try {
        logger_1.logger.info(`Starting OCR for image (${mimeType})`);
        // Create Tesseract worker
        const worker = await (0, tesseract_js_1.createWorker)('eng');
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(imageData, 'base64');
        // Perform OCR
        const { data } = await worker.recognize(imageBuffer);
        await worker.terminate();
        const extractedText = data.text.trim();
        logger_1.logger.info(`OCR completed, extracted ${extractedText.length} characters (confidence: ${data.confidence.toFixed(2)}%)`);
        return extractedText;
    }
    catch (error) {
        logger_1.logger.error(`OCR failed: ${error.message}`);
        return '';
    }
};
exports.extractTextFromImage = extractTextFromImage;
/**
 * Extract text from multiple images
 *
 * @param images Array of {data: base64, mimeType: string}
 * @returns Combined text from all images
 */
const extractTextFromImages = async (images) => {
    if (images.length === 0) {
        return '';
    }
    logger_1.logger.info(`Processing ${images.length} image(s) with OCR`);
    const results = await Promise.all(images.map(img => (0, exports.extractTextFromImage)(img.data, img.mimeType)));
    // Combine all extracted text
    const combinedText = results.join('\n\n').trim();
    logger_1.logger.info(`Total OCR text extracted: ${combinedText.length} characters`);
    return combinedText;
};
exports.extractTextFromImages = extractTextFromImages;
/**
 * Check if an email part is an image
 */
const isImagePart = (mimeType) => {
    return mimeType.startsWith('image/');
};
exports.isImagePart = isImagePart;
