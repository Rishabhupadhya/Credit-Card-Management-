"use strict";
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
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    workspaceId: { type: String, required: true, default: "default" },
    activeTeamId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Team" },
    avatar: { type: String },
    timezone: { type: String, default: "UTC" },
    workingHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "18:00" }
    },
    defaultTaskDuration: { type: String, default: "1h" },
    settings: {
        weekStartDay: { type: Number, default: 1 }, // Monday
        timeFormat: { type: String, default: "24h" },
        showCurrentTimeline: { type: Boolean, default: true },
        enableUndoDelete: { type: Boolean, default: true },
        enableDragDrop: { type: Boolean, default: true },
        focusMode: { type: Boolean, default: false },
        taskReminders: { type: Boolean, default: true },
        dailySummary: { type: Boolean, default: false }
    }
}, { timestamps: true });
exports.User = mongoose_1.default.model("User", UserSchema);
