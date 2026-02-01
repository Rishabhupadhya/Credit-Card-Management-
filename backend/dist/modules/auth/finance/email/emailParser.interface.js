"use strict";
/**
 * Email Parser Interface
 *
 * Strategy Pattern for parsing bank transaction alert emails.
 * Each bank has different email formats, so we use parsers similar to SMS module.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailParserFactory = void 0;
/**
 * Email Parser Factory
 *
 * Manages all registered parsers and routes emails to appropriate parser
 */
class EmailParserFactory {
    constructor() {
        this.parsers = [];
    }
    /**
     * Register a new bank email parser
     */
    registerParser(parser) {
        this.parsers.push(parser);
    }
    /**
     * Find the appropriate parser for the given email
     */
    findParser(email) {
        return this.parsers.find(parser => parser.canParse(email)) || null;
    }
    /**
     * Parse email using the appropriate bank parser
     */
    parse(email) {
        const parser = this.findParser(email);
        if (!parser) {
            return null; // No parser found, might be unsupported bank
        }
        return parser.parse(email);
    }
    /**
     * Get list of all supported banks
     */
    getSupportedBanks() {
        return this.parsers.map(p => p.getBankName());
    }
}
exports.EmailParserFactory = EmailParserFactory;
