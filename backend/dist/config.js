"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtSecret = exports.payrollConfig = void 0;
exports.payrollConfig = {
    socialSecurityRate: 0.0,
    housingFundRate: 0.0,
    taxRate: 0.03,
    taxFreeThreshold: 5000,
};
exports.jwtSecret = process.env.JWT_SECRET || "change-me-secret";
