export interface PayrollConfig {
  socialSecurityRate: number;
  housingFundRate: number;
  taxRate: number;
  taxFreeThreshold: number;
}

export const payrollConfig: PayrollConfig = {
  socialSecurityRate: 0.0,
  housingFundRate: 0.0,
  taxRate: 0.03,
  taxFreeThreshold: 5000,
};

export const jwtSecret = process.env.JWT_SECRET || "change-me-secret";
