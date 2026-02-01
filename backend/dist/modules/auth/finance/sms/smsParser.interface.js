"use strict";
/**
 * SMS Parser Interface
 *
 * Defines the contract for bank-specific SMS parsers.
 * Each bank has different SMS formats, so we use the Strategy Pattern
 * to make the system extensible for new banks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsParserFactory = void 0;
/**
 * SMS Parser Factory
 *
 * Manages all registered parsers and routes SMS to the appropriate parser
 */
class SmsParserFactory {
    constructor() {
        this.parsers = [];
    }
    /**
     * Register a new bank parser
     */
    registerParser(parser) {
        this.parsers.push(parser);
    }
    /**
     * Find the appropriate parser for the given SMS
     */
    findParser(smsText) {
        return this.parsers.find(parser => parser.canParse(smsText)) || null;
    }
    /**
     * Parse SMS using the appropriate bank parser
     */
    parse(smsText, receivedAt = new Date()) {
        const parser = this.findParser(smsText);
        if (!parser) {
            return null;
        }
        return parser.parse(smsText, receivedAt);
    }
    /**
     * Get all registered parsers
     */
    getRegisteredBanks() {
        return this.parsers.map(p => p.getBankName());
    }
}
exports.SmsParserFactory = SmsParserFactory;
