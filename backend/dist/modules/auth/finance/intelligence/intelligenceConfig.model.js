"use strict";
/**
 * Intelligence Configuration Model
 *
 * Stores user-specific thresholds and preferences for ML/intelligence features.
 * Allows per-user or per-card customization.
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
exports.IntelligenceConfig = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const IntelligenceConfigSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    creditCardId: { type: mongoose_1.Schema.Types.ObjectId, ref: "CreditCard", index: true },
    // Defaults are production-tested values
    overspendingAlertThreshold: { type: Number, default: 0.75, min: 0, max: 1 },
    utilizationWarningThreshold: { type: Number, default: 50, min: 0, max: 100 },
    utilizationCriticalThreshold: { type: Number, default: 75, min: 0, max: 100 },
    anomalyZScoreThreshold: { type: Number, default: 2.5, min: 1, max: 5 },
    anomalySensitivity: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    profileUpdateFrequency: {
        type: String,
        enum: ["realtime", "daily", "weekly"],
        default: "daily"
    },
    enableOverspendingPrediction: { type: Boolean, default: true },
    enableAnomalyDetection: { type: Boolean, default: true },
    enableProactiveAlerts: { type: Boolean, default: true }
}, { timestamps: true });
// Unique constraint: one config per user-card combo (or one global per user)
IntelligenceConfigSchema.index({ userId: 1, creditCardId: 1 }, { unique: true });
exports.IntelligenceConfig = mongoose_1.default.model("IntelligenceConfig", IntelligenceConfigSchema);
