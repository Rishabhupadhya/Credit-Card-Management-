"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const logger_1 = require("../utils/logger");
const errorMiddleware = (err, _req, res, _next) => {
    logger_1.logger.error(err.message);
    res.status(500).json({ message: err.message });
};
exports.errorMiddleware = errorMiddleware;
