"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateSettings = exports.updateAvatar = exports.updateProfile = void 0;
const auth_model_1 = require("../auth.model");
const bcrypt_1 = __importDefault(require("bcrypt"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const updateProfile = async (userId, data) => {
    console.log('updateProfile called with userId:', userId);
    console.log('updateProfile data:', data);
    const updateData = {};
    if (data.name)
        updateData.name = data.name;
    if (data.timezone)
        updateData.timezone = data.timezone;
    if (data.workingHours)
        updateData.workingHours = data.workingHours;
    if (data.defaultTaskDuration)
        updateData.defaultTaskDuration = data.defaultTaskDuration;
    console.log('Update data to save:', updateData);
    const updatedUser = await auth_model_1.User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select('-password');
    console.log('User after update:', updatedUser);
    return updatedUser;
};
exports.updateProfile = updateProfile;
const updateAvatar = async (userId, filename) => {
    const user = await auth_model_1.User.findById(userId);
    // Delete old avatar file if exists
    if (user && user.avatar && user.avatar.startsWith("/uploads/")) {
        const oldPath = path_1.default.join(__dirname, "../../../", user.avatar);
        if (fs_1.default.existsSync(oldPath)) {
            fs_1.default.unlinkSync(oldPath);
        }
    }
    const avatarPath = `/uploads/avatars/${filename}`;
    return auth_model_1.User.findByIdAndUpdate(userId, { $set: { avatar: avatarPath } }, { new: true }).select('-password');
};
exports.updateAvatar = updateAvatar;
const updateSettings = async (userId, settings) => {
    // Merge with existing settings to preserve any fields not being updated
    const user = await auth_model_1.User.findById(userId);
    if (!user)
        throw new Error("User not found");
    const updatedSettings = {
        ...user.settings,
        ...settings
    };
    return auth_model_1.User.findByIdAndUpdate(userId, { $set: { settings: updatedSettings } }, { new: true }).select('-password');
};
exports.updateSettings = updateSettings;
const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await auth_model_1.User.findById(userId);
    if (!user)
        throw new Error("User not found");
    const isMatch = await bcrypt_1.default.compare(currentPassword, user.password);
    if (!isMatch)
        throw new Error("Current password is incorrect");
    const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    return { message: "Password changed successfully" };
};
exports.changePassword = changePassword;
