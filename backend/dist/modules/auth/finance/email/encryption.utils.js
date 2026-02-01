"use strict";
/**
 * Token Encryption Utilities
 *
 * Encrypts and decrypts OAuth tokens before storing in database
 * Uses AES-256-GCM for encryption
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptToken = exports.encryptToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";
const ALGORITHM = "aes-256-gcm";
/**
 * Encrypt a token
 */
const encryptToken = (token) => {
    if (!ENCRYPTION_KEY) {
        throw new Error("ENCRYPTION_KEY is not set in environment variables");
    }
    // Generate random IV
    const iv = crypto_1.default.randomBytes(16);
    // Create cipher
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"), iv);
    // Encrypt
    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    // Get auth tag
    const authTag = cipher.getAuthTag();
    // Return: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};
exports.encryptToken = encryptToken;
/**
 * Decrypt a token
 */
const decryptToken = (encryptedToken) => {
    if (!ENCRYPTION_KEY) {
        throw new Error("ENCRYPTION_KEY is not set in environment variables");
    }
    // Split into parts
    const parts = encryptedToken.split(":");
    if (parts.length !== 3) {
        throw new Error("Invalid encrypted token format");
    }
    const [ivHex, authTagHex, encrypted] = parts;
    // Create decipher
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"), Buffer.from(ivHex, "hex"));
    // Set auth tag
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    // Decrypt
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
};
exports.decryptToken = decryptToken;
