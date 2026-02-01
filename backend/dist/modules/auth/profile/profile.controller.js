"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeUserPassword = exports.updateUserSettings = exports.uploadAvatar = exports.updateUserProfile = void 0;
const profile_service_1 = require("./profile.service");
const updateUserProfile = async (req, res, next) => {
    try {
        console.log('Updating profile for user:', req.user.id);
        console.log('Profile update data:', req.body);
        const user = await (0, profile_service_1.updateProfile)(req.user.id, req.body);
        console.log('Updated user:', user);
        res.json(user);
    }
    catch (error) {
        console.error('Profile update error:', error);
        next(error);
    }
};
exports.updateUserProfile = updateUserProfile;
const uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const user = await (0, profile_service_1.updateAvatar)(req.user.id, req.file.filename);
        res.json(user);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadAvatar = uploadAvatar;
const updateUserSettings = async (req, res, next) => {
    try {
        const user = await (0, profile_service_1.updateSettings)(req.user.id, req.body);
        res.json(user);
    }
    catch (error) {
        next(error);
    }
};
exports.updateUserSettings = updateUserSettings;
const changeUserPassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await (0, profile_service_1.changePassword)(req.user.id, currentPassword, newPassword);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.changeUserPassword = changeUserPassword;
