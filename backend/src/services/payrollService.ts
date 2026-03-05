import { payrollConfig } from "../config";

export interface PayrollInput {
  attendance_days?: number;
  base_salary?: number;
  real_salary?: number;
  allowance?: number;
  bonus?: number;
  social_security_pension?: number;
  social_security_medical?: number;
  social_security_unemployment?: number;
  housing_fund?: number;
  other_deduction?: number;
}

export interface PayrollCalculated {
  base_salary: number;
  real_salary: number;
  allowance: number;
  bonus: number;
  social_security_pension: number;
  social_security_medical: number;
  social_security_unemployment: number;
  housing_fund: number;
  other_deduction: number;
  tax: number;
  net_salary: number;
}

export function calculateItem(input: PayrollInput): PayrollCalculated {
  const base_salary = input.base_salary ?? 0;
  const real_salary = input.real_salary ?? base_salary;
  const allowance = input.allowance ?? 0;
  const bonus = input.bonus ?? 0;

  const social_security_pension = input.social_security_pension ?? 0;
  const social_security_medical = input.social_security_medical ?? 0;
  const social_security_unemployment = input.social_security_unemployment ?? 0;
  const housing_fund = input.housing_fund ?? 0;
  const other_deduction = input.other_deduction ?? 0;

  const gross = real_salary + allowance + bonus;
  const socialTotal =
    social_security_pension +
    social_security_medical +
    social_security_unemployment +
    housing_fund;

  const deductible = socialTotal + other_deduction;
  const taxableIncome = Math.max(0, gross - deductible - payrollConfig.taxFreeThreshold);
  const tax = taxableIncome * payrollConfig.taxRate;
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
