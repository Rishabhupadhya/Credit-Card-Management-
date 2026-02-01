"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_model_1 = require("./auth.model");
const jwt_1 = require("../../utils/jwt");
const registerUser = async (name, email, password, workspaceId = "default") => {
    const existing = await auth_model_1.User.findOne({ email });
    if (existing)
        throw new Error("User already exists");
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const avatar = name.charAt(0).toUpperCase();
    const user = await auth_model_1.User.create({
        name,
        email,
        password: hashedPassword,
        workspaceId,
        avatar
    });
    return (0, jwt_1.signToken)({ id: user._id, email: user.email });
};
exports.registerUser = registerUser;
const loginUser = async (email, password) => {
    const user = await auth_model_1.User.findOne({ email });
    if (!user)
        throw new Error("Invalid credentials");
    const isMatch = await bcrypt_1.default.compare(password, user.password);
    if (!isMatch)
        throw new Error("Invalid credentials");
    return (0, jwt_1.signToken)({ id: user._id, email: user.email });
};
exports.loginUser = loginUser;
