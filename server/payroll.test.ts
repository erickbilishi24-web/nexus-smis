import { describe, expect, it } from "vitest";
import { allocatePayrollLoanRepayments, calculateKenyaPayroll, calculateNssf, calculateProgressivePaye, DEFAULT_KENYA_PAYROLL_RULES } from "../shared/payroll";

describe("Kenyan payroll statutory calculation", () => {
  it("applies the monthly PAYE band edges progressively", () => {
    expect(calculateProgressivePaye(24_000, DEFAULT_KENYA_PAYROLL_RULES.payeBands)).toBe(2_400);
    expect(calculateProgressivePaye(32_333, DEFAULT_KENYA_PAYROLL_RULES.payeBands)).toBe(4_483.25);
  });

  it("caps Year 4 NSSF pensionable contributions at the 2026 upper limit", () => {
    expect(calculateNssf(9_000, DEFAULT_KENYA_PAYROLL_RULES.nssf)).toBe(540);
    expect(calculateNssf(108_000, DEFAULT_KENYA_PAYROLL_RULES.nssf)).toBe(6_480);
    expect(calculateNssf(200_000, DEFAULT_KENYA_PAYROLL_RULES.nssf)).toBe(6_480);
  });

  it("computes 2026 statutory deductions, PAYE and employer cost for a baseline salary", () => {
    const result = calculateKenyaPayroll({ basicSalary: 100_000 }, DEFAULT_KENYA_PAYROLL_RULES);
    expect(result).toMatchObject({
      gross: 100_000,
      pensionableGross: 100_000,
      nssfEmployee: 6_000,
      nssfEmployer: 6_000,
      shif: 2_750,
      housingLevyEmployee: 1_500,
      housingLevyEmployer: 1_500,
      taxableIncome: 89_750,
      payeBeforeRelief: 21_708.35,
      personalRelief: 2_400,
      paye: 19_308.35,
      netPay: 70_441.65,
      totalEmployerCost: 107_500,
    });
  });

  it("uses the SHIF minimum at low salary and does not give non-resident personal relief", () => {
    const resident = calculateKenyaPayroll({ basicSalary: 10_000 }, DEFAULT_KENYA_PAYROLL_RULES);
    const nonResident = calculateKenyaPayroll({ basicSalary: 10_000, resident: false }, DEFAULT_KENYA_PAYROLL_RULES);
    expect(resident.shif).toBe(300);
    expect(resident.personalRelief).toBe(2_400);
    expect(nonResident.personalRelief).toBe(0);
    expect(nonResident.paye).toBeGreaterThan(resident.paye);
  });

  it("keeps the full post-retirement medical withholding while applying the statutory tax deduction cap", () => {
    const result = calculateKenyaPayroll({ basicSalary: 100_000, postRetirementMedical: 20_000, mortgageInterest: 40_000 }, DEFAULT_KENYA_PAYROLL_RULES);
    const withoutMortgageClaim = calculateKenyaPayroll({ basicSalary: 100_000, postRetirementMedical: 20_000 }, DEFAULT_KENYA_PAYROLL_RULES);
    expect(result.postRetirementMedical).toBe(20_000);
    expect(result.postRetirementMedicalDeduction).toBe(15_000);
    expect(result.mortgageInterest).toBe(40_000);
    expect(result.netPay).toBeGreaterThan(withoutMortgageClaim.netPay);
    expect(result.taxableIncome).toBe(44_750);
  });

  it("adds non-taxable earnings to gross but not taxable gross", () => {
    const result = calculateKenyaPayroll({ basicSalary: 50_000, earnings: [{ name: "Verified exempt item", amount: 5_000, taxable: false }] }, DEFAULT_KENYA_PAYROLL_RULES);
    expect(result.gross).toBe(55_000);
    expect(result.taxableGross).toBe(50_000);
  });

  it("caps approved loan repayments by both the balance and remaining net pay", () => {
    const result = allocatePayrollLoanRepayments([
      { loanId: 1, loanType: "loan" as const, description: "Staff loan", outstandingBalance: 20_000, installmentAmount: 12_000 },
      { loanId: 2, loanType: "advance" as const, description: "Advance", outstandingBalance: 5_000, installmentAmount: 5_000 },
    ], 14_000);
    expect(result).toEqual([
      { loanId: 1, loanType: "loan", description: "Staff loan", amount: 12_000 },
      { loanId: 2, loanType: "advance", description: "Advance", amount: 2_000 },
    ]);
    expect(result.reduce((total, item) => total + item.amount, 0)).toBeLessThanOrEqual(14_000);
  });
});
