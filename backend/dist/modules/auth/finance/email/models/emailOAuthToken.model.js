"use strict";
/**
 * Email OAuth Token Model
 *
 * Stores encrypted OAuth tokens for Gmail and Outlook
 * Used for fetching user emails via API
 *
 * SECURITY:
 * - Tokens are encrypted before storage
 * - Users can revoke access anytime
 * - Tokens expire and need refresh
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailOAuthToken = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const EmailOAuthTokenSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    provider: {
        type: String,
        enum: ["gmail", "outlook"],
        required: true,
    },
    accessToken: {
        type: String,
        required: true,
    },
    refreshToken: {
        type: String,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    scope: {
        type: String,
        required: true,
    },
    connectedAt: {
        type: Date,
        default: Date.now,
    },
    lastUsed: {
        type: Date,
    },
}, { timestamps: true });
// Compound unique index: one token per user per provider
EmailOAuthTokenSchema.index({ userId: 1, provider: 1 }, { unique: true });
// Index for finding expired tokens
EmailOAuthTokenSchema.index({ expiresAt: 1 });
exports.EmailOAuthToken = mongoose_1.default.model("EmailOAuthToken", EmailOAuthTokenSchema);
