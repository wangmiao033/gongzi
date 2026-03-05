"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateItem = calculateItem;
const config_1 = require("../config");
function calculateItem(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const base_salary = (_a = input.base_salary) !== null && _a !== void 0 ? _a : 0;
    const real_salary = (_b = input.real_salary) !== null && _b !== void 0 ? _b : base_salary;
    const allowance = (_c = input.allowance) !== null && _c !== void 0 ? _c : 0;
    const bonus = (_d = input.bonus) !== null && _d !== void 0 ? _d : 0;
    const social_security_pension = (_e = input.social_security_pension) !== null && _e !== void 0 ? _e : 0;
    const social_security_medical = (_f = input.social_security_medical) !== null && _f !== void 0 ? _f : 0;
    const social_security_unemployment = (_g = input.social_security_unemployment) !== null && _g !== void 0 ? _g : 0;
    const housing_fund = (_h = input.housing_fund) !== null && _h !== void 0 ? _h : 0;
    const other_deduction = (_j = input.other_deduction) !== null && _j !== void 0 ? _j : 0;
    const gross = real_salary + allowance + bonus;
    const socialTotal = social_security_pension +
        social_security_medical +
        social_security_unemployment +
        housing_fund;
    const deductible = socialTotal + other_deduction;
    const taxableIncome = Math.max(0, gross - deductible - config_1.payrollConfig.taxFreeThreshold);
    const tax = taxableIncome * config_1.payrollConfig.taxRate;
    const net_salary = gross - deductible - tax;
    return {
        base_salary,
        real_salary,
        allowance,
        bonus,
        social_security_pension,
        social_security_medical,
        social_security_unemployment,
        housing_fund,
        other_deduction,
        tax,
        net_salary,
    };
}
