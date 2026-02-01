"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const auth_service_1 = require("./auth.service");
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const token = await (0, auth_service_1.registerUser)(name, email, password);
        res.status(201).json({ token });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const token = await (0, auth_service_1.loginUser)(email, password);
        res.json({ token });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
