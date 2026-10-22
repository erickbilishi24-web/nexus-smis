export type PayeBand = { ceiling: number | null; rate: number };

export type KenyaPayrollRules = {
  payeBands: PayeBand[];
  personalRelief: number;
  nssf: { tierOneLimit: number; upperLimit: number; rate: number };
  shif: { rate: number; minimum: number };
  housingLevy: { employeeRate: number; employerRate: number };
  pensionDeductionCap: number;
  postRetirementMedicalCap: number;
  mortgageInterestCap: number;
};

export type PayrollLine = { name: string; amount: number; taxable?: boolean; pensionable?: boolean; taxDeductible?: boolean };

export type PayrollInput = {
  basicSalary: number;
  earnings?: PayrollLine[];
  deductions?: PayrollLine[];
  adjustments?: Array<{ kind: "earning" | "deduction"; amount: number; taxable: boolean }>;
  resident?: boolean;
  additionalPension?: number;
  postRetirementMedical?: number;
  mortgageInterest?: number;
};

export type PayrollCalculation = {
  gross: number;
  taxableGross: number;
  pensionableGross: number;
  nssfEmployee: number;
  nssfEmployer: number;
  shif: number;
  housingLevyEmployee: number;
  housingLevyEmployer: number;
  taxableIncome: number;
  payeBeforeRelief: number;
  personalRelief: number;
  paye: number;
  additionalPension: number;
  postRetirementMedical: number;
  postRetirementMedicalDeduction: number;
  mortgageInterest: number;
  otherDeductions: number;
  netPay: number;
  totalEmployerCost: number;
};

export const DEFAULT_KENYA_PAYROLL_RULES: KenyaPayrollRules = {
  payeBands: [
    { ceiling: 24_000, rate: 0.1 },
    { ceiling: 32_333, rate: 0.25 },
    { ceiling: 500_000, rate: 0.3 },
    { ceiling: 800_000, rate: 0.325 },
    { ceiling: null, rate: 0.35 },
  ],
  personalRelief: 2_400,
  nssf: { tierOneLimit: 9_000, upperLimit: 108_000, rate: 0.06 },
  shif: { rate: 0.0275, minimum: 300 },
  housingLevy: { employeeRate: 0.015, employerRate: 0.015 },
  pensionDeductionCap: 30_000,
  postRetirementMedicalCap: 15_000,
  mortgageInterestCap: 30_000,
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const nonNegative = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);

export function allocatePayrollLoanRepayments<T extends { loanId: number; loanType: "loan" | "advance"; description: string; outstandingBalance: number; installmentAmount: number }>(loans: T[], availableNetPay: number) {
  let remaining = nonNegative(availableNetPay);
  return loans.map(loan => {
    const amount = money(Math.min(nonNegative(loan.outstandingBalance), nonNegative(loan.installmentAmount), remaining));
    remaining = money(Math.max(0, remaining - amount));
    return { loanId: loan.loanId, loanType: loan.loanType, description: loan.description, amount };
  }).filter(loan => loan.amount > 0);
}

export function calculateProgressivePaye(taxableIncome: number, bands: PayeBand[]) {
  const ordered = [...bands].sort((a, b) => (a.ceiling ?? Number.POSITIVE_INFINITY) - (b.ceiling ?? Number.POSITIVE_INFINITY));
  let remaining = nonNegative(taxableIncome);
  let lower = 0;
  let tax = 0;
  for (const band of ordered) {
    if (remaining <= 0) break;
    const width = band.ceiling == null ? remaining : Math.max(0, band.ceiling - lower);
    const taxed = Math.min(remaining, width);
    tax += taxed * band.rate;
    remaining -= taxed;
    if (band.ceiling != null) lower = band.ceiling;
  }
  if (remaining > 0) throw new Error("PAYE_BANDS_DO_NOT_COVER_TAXABLE_INCOME");
  return money(tax);
}

export function calculateNssf(pensionablePay: number, rule: KenyaPayrollRules["nssf"]) {
  const earnings = nonNegative(pensionablePay);
  const tierOne = Math.min(earnings, rule.tierOneLimit);
  const tierTwo = Math.max(0, Math.min(earnings, rule.upperLimit) - rule.tierOneLimit);
  return money((tierOne + tierTwo) * rule.rate);
}

export function calculateKenyaPayroll(input: PayrollInput, rules: KenyaPayrollRules): PayrollCalculation {
  const basic = nonNegative(input.basicSalary);
  const earnings = (input.earnings ?? []).map(line => ({ ...line, amount: nonNegative(line.amount) }));
  const adjustments = input.adjustments ?? [];
  const gross = money(basic + earnings.reduce((sum, line) => sum + line.amount, 0) + adjustments.filter(item => item.kind === "earning").reduce((sum, item) => sum + nonNegative(item.amount), 0));
  const taxableGross = money(basic + earnings.filter(line => line.taxable !== false).reduce((sum, line) => sum + line.amount, 0) + adjustments.filter(item => item.kind === "earning" && item.taxable).reduce((sum, item) => sum + nonNegative(item.amount), 0));
  const pensionableGross = money(basic + earnings.filter(line => line.pensionable === true).reduce((sum, line) => sum + line.amount, 0));

  const nssfEmployee = calculateNssf(pensionableGross, rules.nssf);
  const nssfEmployer = nssfEmployee;
  const shif = money(Math.max(rules.shif.minimum, gross * rules.shif.rate));
  const housingLevyEmployee = money(gross * rules.housingLevy.employeeRate);
  const housingLevyEmployer = money(gross * rules.housingLevy.employerRate);
  const additionalPension = money(nonNegative(input.additionalPension ?? 0));
  const postRetirementMedical = money(nonNegative(input.postRetirementMedical ?? 0));
  const postRetirementMedicalDeduction = money(Math.min(postRetirementMedical, rules.postRetirementMedicalCap));
  const mortgageInterest = money(nonNegative(input.mortgageInterest ?? 0));
  const mortgageInterestDeduction = money(Math.min(mortgageInterest, rules.mortgageInterestCap));
  const deductiblePension = Math.min(rules.pensionDeductionCap, nssfEmployee + additionalPension);
  const taxDeductibleAdjustments = (input.deductions ?? []).filter(line => line.taxDeductible).reduce((sum, line) => sum + nonNegative(line.amount), 0) + adjustments.filter(item => item.kind === "deduction" && item.taxable).reduce((sum, item) => sum + nonNegative(item.amount), 0);
  const taxableIncome = money(Math.max(0, taxableGross - shif - housingLevyEmployee - deductiblePension - postRetirementMedicalDeduction - mortgageInterestDeduction - taxDeductibleAdjustments));
  const payeBeforeRelief = calculateProgressivePaye(taxableIncome, rules.payeBands);
  const personalRelief = input.resident === false ? 0 : money(rules.personalRelief);
  const paye = money(Math.max(0, payeBeforeRelief - personalRelief));

  const otherDeductions = money(
    (input.deductions ?? []).reduce((sum, line) => sum + nonNegative(line.amount), 0) +
    adjustments.filter(item => item.kind === "deduction").reduce((sum, item) => sum + nonNegative(item.amount), 0),
  );
  const netPay = money(Math.max(0, gross - nssfEmployee - shif - housingLevyEmployee - additionalPension - postRetirementMedical - paye - otherDeductions));
  const totalEmployerCost = money(gross + nssfEmployer + housingLevyEmployer);

  return {
    gross,
    taxableGross,
    pensionableGross,
    nssfEmployee,
    nssfEmployer,
    shif,
    housingLevyEmployee,
    housingLevyEmployer,
    taxableIncome,
    payeBeforeRelief,
    personalRelief,
    paye,
    additionalPension,
    postRetirementMedical,
    postRetirementMedicalDeduction,
    mortgageInterest,
    otherDeductions,
    netPay,
    totalEmployerCost,
  };
}
