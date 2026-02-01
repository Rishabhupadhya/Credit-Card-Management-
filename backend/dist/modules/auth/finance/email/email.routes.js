"use strict";
/**
 * Email Processing Routes
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
const express_1 = require("express");
const auth_middleware_1 = require("../../../../middleware/auth.middleware");
const emailController = __importStar(require("./email.controller"));
const router = (0, express_1.Router)();
// OAuth authorization endpoints (require auth)
router.get("/oauth/gmail/authorize", auth_middleware_1.authMiddleware, emailController.getGmailOAuthUrl);
router.get("/oauth/outlook/authorize", auth_middleware_1.authMiddleware, emailController.getOutlookOAuthUrl);
router.get("/oauth/status", auth_middleware_1.authMiddleware, emailController.getOAuthStatus);
// OAuth callback endpoints (NO auth middleware - handled by OAuth state parameter)
router.get("/oauth/gmail/callback", emailController.handleGmailCallback);
router.get("/oauth/outlook/callback", emailController.handleOutlookCallback);
// Email processing endpoints (require auth)
router.post("/process", auth_middleware_1.authMiddleware, emailController.processUserEmails);
// Disconnect email account (require auth)
router.delete("/disconnect/:provider", auth_middleware_1.authMiddleware, emailController.disconnectEmailAccount);
// Statistics and info (require auth)
router.get("/stats", auth_middleware_1.authMiddleware, emailController.getEmailStats);
router.get("/supported-banks", auth_middleware_1.authMiddleware, emailController.getSupportedBanksList);
// Clear import history (require auth)
router.delete("/clear-history", auth_middleware_1.authMiddleware, emailController.clearEmailHistory);
exports.default = router;
