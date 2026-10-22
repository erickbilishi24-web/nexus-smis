import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { allocatePayrollLoanRepayments, calculateKenyaPayroll, DEFAULT_KENYA_PAYROLL_RULES, type KenyaPayrollRules, type PayrollLine } from "../shared/payroll";
import {
  auditLogs, expenditures, payrollAdjustments, payrollCompensation, payrollItems,
  payrollLoanRepayments, payrollLoans, payrollRules, payrollRuns, schoolSettings, staffProfiles,
} from "../drizzle/schema";
import { requireDb, userCan, writeAudit } from "./smis";

const money = (value: number) => Math.round(value * 100) / 100;
const asAmount = (value: unknown) => Number(value ?? 0);
const asDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
const dateString = (value: Date | string | null | undefined) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "").slice(0, 10);

async function schoolScope() {
  const db = await requireDb();
  const row = (await db.select({ id: schoolSettings.id }).from(schoolSettings).limit(1))[0];
  if (!row?.id) throw new Error("SCHOOL_SETTINGS_NOT_CONFIGURED");
  return { db, schoolId: row.id };
}

async function demand(userId: number, role: string, permission: string) {
  if (!await userCan(userId, role, permission)) throw new Error("FORBIDDEN");
}

function validRules(value: unknown): value is KenyaPayrollRules {
  if (!value || typeof value !== "object") return false;
  const candidate = value as KenyaPayrollRules;
  return Array.isArray(candidate.payeBands) && candidate.payeBands.length > 0 &&
    candidate.payeBands.every(band => (band.ceiling === null || (Number.isFinite(band.ceiling) && band.ceiling > 0)) && Number.isFinite(band.rate) && band.rate >= 0 && band.rate <= 1) &&
    Number.isFinite(candidate.personalRelief) && candidate.personalRelief >= 0 &&
    Number.isFinite(candidate.nssf?.tierOneLimit) && candidate.nssf.tierOneLimit > 0 && Number.isFinite(candidate.nssf?.upperLimit) && candidate.nssf.upperLimit >= candidate.nssf.tierOneLimit && Number.isFinite(candidate.nssf?.rate) && candidate.nssf.rate >= 0 && candidate.nssf.rate <= 1 &&
    Number.isFinite(candidate.shif?.rate) && candidate.shif.rate >= 0 && candidate.shif.rate <= 1 && Number.isFinite(candidate.shif?.minimum) && candidate.shif.minimum >= 0 &&
    Number.isFinite(candidate.housingLevy?.employeeRate) && candidate.housingLevy.employeeRate >= 0 && candidate.housingLevy.employeeRate <= 1 && Number.isFinite(candidate.housingLevy?.employerRate) && candidate.housingLevy.employerRate >= 0 && candidate.housingLevy.employerRate <= 1 &&
    Number.isFinite(candidate.pensionDeductionCap) && candidate.pensionDeductionCap >= 0 && Number.isFinite(candidate.postRetirementMedicalCap) && candidate.postRetirementMedicalCap >= 0 && Number.isFinite(candidate.mortgageInterestCap) && candidate.mortgageInterestCap >= 0;
}

function parseLines(value: unknown): PayrollLine[] {
  let parsed: unknown;
  try { parsed = JSON.parse(String(value ?? "[]")); } catch { throw new Error("PAYROLL_LINES_INVALID"); }
  if (!Array.isArray(parsed) || parsed.length > 30) throw new Error("PAYROLL_LINES_INVALID");
  return parsed.map((line: any) => {
    const name = String(line?.name ?? "").trim();
    const amount = Number(line?.amount);
    if (!name || name.length > 120 || !Number.isFinite(amount) || amount < 0 || amount > 10_000_000) throw new Error("PAYROLL_LINES_INVALID");
    return { name, amount: money(amount), taxable: line.taxable !== false, pensionable: line.pensionable === true, taxDeductible: line.taxDeductible === true };
  });
}

async function rulesForPeriod(db: Awaited<ReturnType<typeof requireDb>>, schoolId: number, periodDate: Date) {
  const rulesRow = (await db.select().from(payrollRules).where(and(eq(payrollRules.schoolId, schoolId), lte(payrollRules.effectiveFrom, periodDate))).orderBy(desc(payrollRules.effectiveFrom)).limit(1))[0];
  if (!rulesRow) throw new Error("NO_EFFECTIVE_PAYROLL_RULES");
  let rules: unknown;
  try { rules = JSON.parse(rulesRow.rulesJson); } catch { throw new Error("PAYROLL_RULES_INVALID"); }
  if (!validRules(rules)) throw new Error("PAYROLL_RULES_INVALID");
  return { rules, rulesRow };
}

export async function getPayrollWorkspace(userId: number, role: string) {
  await demand(userId, role, "payroll.view");
  const { db, schoolId } = await schoolScope();
  const [staffRows, compensationRows, adjustmentRows, runRows, ruleRows, loanRows] = await Promise.all([
    db.select({ id: staffProfiles.id, displayName: staffProfiles.displayName, role: staffProfiles.role, status: staffProfiles.status }).from(staffProfiles).orderBy(staffProfiles.displayName),
    db.select().from(payrollCompensation).where(eq(payrollCompensation.schoolId, schoolId)).orderBy(desc(payrollCompensation.effectiveFrom)),
    db.select().from(payrollAdjustments).where(eq(payrollAdjustments.schoolId, schoolId)).orderBy(desc(payrollAdjustments.id)).limit(150),
    db.select().from(payrollRuns).where(eq(payrollRuns.schoolId, schoolId)).orderBy(desc(payrollRuns.period)).limit(36),
    db.select().from(payrollRules).where(eq(payrollRules.schoolId, schoolId)).orderBy(desc(payrollRules.effectiveFrom)).limit(24),
    db.select().from(payrollLoans).where(eq(payrollLoans.schoolId, schoolId)).orderBy(desc(payrollLoans.id)).limit(300),
  ]);
  const runIds = runRows.map(row => row.id);
  const slipRows = runIds.length ? await db.select().from(payrollItems).where(and(eq(payrollItems.schoolId, schoolId), inArray(payrollItems.runId, runIds))).orderBy(desc(payrollItems.runId), payrollItems.employeeName) : [];
  const runsById = new Map(runRows.map(run => [run.id, run]));
  const itemCountByRun = new Map<number, number>();
  for (const row of slipRows) itemCountByRun.set(row.runId, (itemCountByRun.get(row.runId) ?? 0) + 1);
  const staffById = new Map(staffRows.map(staff => [staff.id, staff.displayName]));
  return {
    currentUserId: userId,
    staff: staffRows,
    compensation: compensationRows.map(row => ({ ...row, earnings: parseLines(row.earningsJson), deductions: parseLines(row.deductionsJson) })),
    adjustments: adjustmentRows,
    runs: runRows.map(run => ({ ...run, itemCount: itemCountByRun.get(run.id) ?? 0 })),
    latestRunItems: slipRows.filter(row => row.runId === runIds[0]).map(row => ({ ...row, period: runsById.get(row.runId)?.period ?? "", status: runsById.get(row.runId)?.status ?? "draft", calculation: JSON.parse(row.calculationJson) })),
    loans: loanRows.map(row => ({ ...row, staffName: staffById.get(row.staffProfileId) ?? `Staff #${row.staffProfileId}` })),
    rules: ruleRows.map(row => ({ ...row, rules: JSON.parse(row.rulesJson) })),
  };
}

export async function getMyPayrollSlips(userId: number) {
  const { db, schoolId } = await schoolScope();
  const profile = (await db.select({ id: staffProfiles.id }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  if (!profile) return [];
  const slips = await db.select().from(payrollItems).where(and(eq(payrollItems.schoolId, schoolId), eq(payrollItems.staffProfileId, profile.id))).orderBy(desc(payrollItems.id)).limit(36);
  const runs = slips.length ? await db.select().from(payrollRuns).where(and(eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.status, "closed"), inArray(payrollRuns.id, slips.map(row => row.runId)))) : [];
  const closedRuns = new Map(runs.map(run => [run.id, run]));
  return slips.filter(row => closedRuns.has(row.runId)).map(row => ({ ...row, period: closedRuns.get(row.runId)!.period, calculation: JSON.parse(row.calculationJson) }));
}

export async function savePayrollRules(input: { effectiveFrom: string; rules: KenyaPayrollRules; sourceNotes?: string | null }, userId: number, role: string) {
  await demand(userId, role, "payroll.rules");
  if (!validRules(input.rules)) throw new Error("PAYROLL_RULES_INVALID");
  const { db, schoolId } = await schoolScope();
  await db.insert(payrollRules).values({ schoolId, effectiveFrom: asDate(input.effectiveFrom), rulesJson: JSON.stringify(input.rules), sourceNotes: input.sourceNotes?.trim().slice(0, 600) || null, createdByUserId: userId }).onDuplicateKeyUpdate({ set: { rulesJson: JSON.stringify(input.rules), sourceNotes: input.sourceNotes?.trim().slice(0, 600) || null, createdByUserId: userId } });
  await writeAudit(userId, "payroll.rules.update", "payroll_rules", input.effectiveFrom, { sourceNotes: input.sourceNotes ?? null });
  return { ok: true };
}

export async function savePayrollCompensation(input: {
  staffProfileId: number; effectiveFrom: string; basicSalary: number; earnings: PayrollLine[]; deductions: PayrollLine[];
  resident: boolean; additionalPension: number; postRetirementMedical: number; mortgageInterest: number;
}, userId: number, role: string) {
  await demand(userId, role, "payroll.edit");
  const { db, schoolId } = await schoolScope();
  const staff = (await db.select({ id: staffProfiles.id, displayName: staffProfiles.displayName }).from(staffProfiles).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.status, "active"))).limit(1))[0];
  if (!staff) throw new Error("ACTIVE_STAFF_NOT_FOUND");
  const amountFields = [input.basicSalary, input.additionalPension, input.postRetirementMedical, input.mortgageInterest];
  if (amountFields.some(value => !Number.isFinite(value) || value < 0 || value > 10_000_000)) throw new Error("COMPENSATION_AMOUNT_INVALID");
  const earnings = parseLines(JSON.stringify(input.earnings));
  const deductions = parseLines(JSON.stringify(input.deductions));
  await db.insert(payrollCompensation).values({
    schoolId, staffProfileId: input.staffProfileId, effectiveFrom: asDate(input.effectiveFrom), effectiveTo: null,
    basicSalary: String(money(input.basicSalary)), earningsJson: JSON.stringify(earnings), deductionsJson: JSON.stringify(deductions),
    resident: input.resident ? 1 : 0, additionalPension: String(money(input.additionalPension)),
    postRetirementMedical: String(money(input.postRetirementMedical)), mortgageInterest: String(money(input.mortgageInterest)), createdByUserId: userId,
  }).onDuplicateKeyUpdate({ set: {
    effectiveTo: null, basicSalary: String(money(input.basicSalary)), earningsJson: JSON.stringify(earnings), deductionsJson: JSON.stringify(deductions),
    resident: input.resident ? 1 : 0, additionalPension: String(money(input.additionalPension)),
    postRetirementMedical: String(money(input.postRetirementMedical)), mortgageInterest: String(money(input.mortgageInterest)), createdByUserId: userId,
  } });
  await writeAudit(userId, "payroll.compensation.upsert", "payroll_compensation", input.staffProfileId, { effectiveFrom: input.effectiveFrom, basicSalary: money(input.basicSalary), earningsCount: earnings.length, deductionsCount: deductions.length });
  return { ok: true, staffName: staff.displayName };
}

export async function createPayrollAdjustment(input: { staffProfileId: number; period: string; kind: "earning" | "deduction"; description: string; amount: number; taxable: boolean }, userId: number, role: string) {
  await demand(userId, role, "payroll.edit");
  const { db, schoolId } = await schoolScope();
  const description = input.description.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period) || !description || description.length > 120 || !Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 10_000_000) throw new Error("PAYROLL_ADJUSTMENT_INVALID");
  const staff = (await db.select({ id: staffProfiles.id }).from(staffProfiles).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.status, "active"))).limit(1))[0];
  if (!staff) throw new Error("ACTIVE_STAFF_NOT_FOUND");
  const id = (await db.insert(payrollAdjustments).values({ schoolId, staffProfileId: input.staffProfileId, period: input.period, kind: input.kind, description, amount: String(money(input.amount)), taxable: input.taxable ? 1 : 0, status: "pending", createdByUserId: userId }).$returningId())[0].id;
  await writeAudit(userId, "payroll.adjustment.create", "payroll_adjustment", id, { staffProfileId: input.staffProfileId, period: input.period, kind: input.kind, amount: money(input.amount) });
  return { ok: true, id };
}

export async function reviewPayrollAdjustment(input: { adjustmentId: number; status: "approved" | "rejected" }, userId: number, role: string) {
  await demand(userId, role, "payroll.approve");
  const { db, schoolId } = await schoolScope();
  const row = (await db.select().from(payrollAdjustments).where(and(eq(payrollAdjustments.id, input.adjustmentId), eq(payrollAdjustments.schoolId, schoolId))).limit(1))[0];
  if (!row || row.status !== "pending") throw new Error("ADJUSTMENT_NOT_PENDING");
  if (row.createdByUserId === userId) throw new Error("SEPARATION_OF_DUTIES_REQUIRED");
  await db.update(payrollAdjustments).set({ status: input.status, approvedByUserId: userId }).where(and(eq(payrollAdjustments.id, row.id), eq(payrollAdjustments.schoolId, schoolId)));
  await writeAudit(userId, `payroll.adjustment.${input.status}`, "payroll_adjustment", row.id, { staffProfileId: row.staffProfileId, period: row.period });
  return { ok: true };
}

export async function createPayrollLoan(input: { staffProfileId: number; loanType: "loan" | "advance"; description: string; principalAmount: number; installmentAmount: number; startPeriod: string }, userId: number, role: string) {
  await demand(userId, role, "payroll.edit");
  const { db, schoolId } = await schoolScope();
  const description = input.description.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.startPeriod) || !description || description.length > 160 || !Number.isFinite(input.principalAmount) || input.principalAmount <= 0 || input.principalAmount > 10_000_000 || !Number.isFinite(input.installmentAmount) || input.installmentAmount <= 0 || input.installmentAmount > input.principalAmount) throw new Error("PAYROLL_LOAN_INPUT_INVALID");
  const staff = (await db.select({ id: staffProfiles.id }).from(staffProfiles).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.status, "active"))).limit(1))[0];
  if (!staff) throw new Error("ACTIVE_STAFF_NOT_FOUND");
  const id = (await db.insert(payrollLoans).values({ schoolId, staffProfileId: input.staffProfileId, loanType: input.loanType, description, principalAmount: String(money(input.principalAmount)), outstandingBalance: String(money(input.principalAmount)), installmentAmount: String(money(input.installmentAmount)), startPeriod: input.startPeriod, status: "pending", createdByUserId: userId }).$returningId())[0].id;
  await writeAudit(userId, "payroll.loan.create", "payroll_loan", id, { staffProfileId: input.staffProfileId, loanType: input.loanType, principalAmount: money(input.principalAmount), installmentAmount: money(input.installmentAmount), startPeriod: input.startPeriod });
  return { ok: true, id };
}

export async function reviewPayrollLoan(input: { loanId: number; status: "approved" | "rejected" }, userId: number, role: string) {
  await demand(userId, role, "payroll.approve");
  const { db, schoolId } = await schoolScope();
  const row = (await db.select().from(payrollLoans).where(and(eq(payrollLoans.id, input.loanId), eq(payrollLoans.schoolId, schoolId))).limit(1))[0];
  if (!row || row.status !== "pending") throw new Error("PAYROLL_LOAN_NOT_PENDING");
  if (row.createdByUserId === userId) throw new Error("SEPARATION_OF_DUTIES_REQUIRED");
  await db.update(payrollLoans).set({ status: input.status, approvedByUserId: userId, approvedAt: new Date() }).where(and(eq(payrollLoans.id, row.id), eq(payrollLoans.schoolId, schoolId), eq(payrollLoans.status, "pending")));
  await writeAudit(userId, `payroll.loan.${input.status}`, "payroll_loan", row.id, { staffProfileId: row.staffProfileId, loanType: row.loanType, principalAmount: Number(row.principalAmount), installmentAmount: Number(row.installmentAmount) });
  return { ok: true };
}

export async function recordPayrollExport(input: { kind: "payslip" | "monthly_summary" | "deduction_schedule" | "annual_summary"; period?: string; year?: number }, userId: number, role: string) {
  await demand(userId, role, "payroll.view");
  const { db, schoolId } = await schoolScope();
  let reportRuns: Array<{ id: number; period: string }> = [];
  if (input.kind === "annual_summary") {
    if (!input.year || input.year < 2000 || input.year > 2100) throw new Error("REPORT_YEAR_INVALID");
    reportRuns = await db.select({ id: payrollRuns.id, period: payrollRuns.period }).from(payrollRuns).where(and(eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.status, "closed"), gte(payrollRuns.period, `${input.year}-01`), lte(payrollRuns.period, `${input.year}-12`))).orderBy(payrollRuns.period);
  } else if (input.kind === "monthly_summary" || input.kind === "deduction_schedule") {
    if (!input.period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) throw new Error("REPORT_PERIOD_INVALID");
    reportRuns = await db.select({ id: payrollRuns.id, period: payrollRuns.period }).from(payrollRuns).where(and(eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.status, "closed"), eq(payrollRuns.period, input.period))).limit(1);
  }
  const reportItems = reportRuns.length ? await db.select({ id: payrollItems.id, staffProfileId: payrollItems.staffProfileId, runId: payrollItems.runId, employeeName: payrollItems.employeeName, gross: payrollItems.gross, paye: payrollItems.paye, net: payrollItems.net, calculationJson: payrollItems.calculationJson }).from(payrollItems).where(and(eq(payrollItems.schoolId, schoolId), inArray(payrollItems.runId, reportRuns.map(run => run.id)))).orderBy(payrollItems.employeeName) : [];
  const periodByRun = new Map(reportRuns.map(run => [run.id, run.period]));
  const rows = reportItems.map(row => ({ ...row, period: periodByRun.get(row.runId) ?? "", calculation: JSON.parse(row.calculationJson) }));
  await writeAudit(userId, "payroll.export", input.kind, schoolId, { kind: input.kind, period: input.period ?? null, year: input.year ?? null });
  return { ok: true, rows };
}

export async function createPayrollDraft(input: { period: string }, userId: number, role: string) {
  await demand(userId, role, "payroll.edit");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) throw new Error("PERIOD_INVALID");
  const { db, schoolId } = await schoolScope();
  const existing = (await db.select().from(payrollRuns).where(and(eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.period, input.period))).limit(1))[0];
  if (existing) throw new Error("PAYROLL_RUN_ALREADY_EXISTS");
  const periodDate = `${input.period}-01`;
  const periodDateValue = asDate(periodDate);
  const { rules, rulesRow } = await rulesForPeriod(db, schoolId, periodDateValue);
  const [staffRows, allContracts, adjustmentRows, loanRows] = await Promise.all([
    db.select({ id: staffProfiles.id, displayName: staffProfiles.displayName }).from(staffProfiles).where(eq(staffProfiles.status, "active")).orderBy(staffProfiles.displayName),
    db.select().from(payrollCompensation).where(and(eq(payrollCompensation.schoolId, schoolId), lte(payrollCompensation.effectiveFrom, periodDateValue))).orderBy(desc(payrollCompensation.effectiveFrom)),
    db.select().from(payrollAdjustments).where(and(eq(payrollAdjustments.schoolId, schoolId), eq(payrollAdjustments.period, input.period), eq(payrollAdjustments.status, "approved"))),
    db.select().from(payrollLoans).where(and(eq(payrollLoans.schoolId, schoolId), eq(payrollLoans.status, "approved"), lte(payrollLoans.startPeriod, input.period))).orderBy(payrollLoans.id),
  ]);
  const effectiveContractByStaff = new Map<number, (typeof allContracts)[number]>();
  for (const contract of allContracts) if (!effectiveContractByStaff.has(contract.staffProfileId) && (!contract.effectiveTo || dateString(contract.effectiveTo) >= periodDate)) effectiveContractByStaff.set(contract.staffProfileId, contract);
  const rows: Array<Omit<typeof payrollItems.$inferInsert, "id" | "runId" | "createdAt">> = [];
  for (const staff of staffRows) {
    const contract = effectiveContractByStaff.get(staff.id);
    if (!contract) continue;
    const adjustments = adjustmentRows.filter(row => row.staffProfileId === staff.id).map(row => ({ kind: row.kind, amount: asAmount(row.amount), taxable: row.taxable === 1 }));
    const earnings = parseLines(contract.earningsJson);
    const contractDeductions = parseLines(contract.deductionsJson);
    const baseCalculation = calculateKenyaPayroll({
      basicSalary: asAmount(contract.basicSalary), earnings, deductions: contractDeductions,
      adjustments, resident: contract.resident === 1, additionalPension: asAmount(contract.additionalPension),
      postRetirementMedical: asAmount(contract.postRetirementMedical), mortgageInterest: asAmount(contract.mortgageInterest),
    }, rules);
    const loanRepayments = allocatePayrollLoanRepayments(loanRows.filter(loan => loan.staffProfileId === staff.id).map(loan => ({ loanId: loan.id, loanType: loan.loanType, description: loan.description, outstandingBalance: asAmount(loan.outstandingBalance), installmentAmount: asAmount(loan.installmentAmount) })), baseCalculation.netPay);
    const deductions = [...contractDeductions, ...loanRepayments.map(item => ({ name: `${item.loanType === "advance" ? "Advance" : "Loan"}: ${item.description}`, amount: item.amount, taxable: false, pensionable: false, taxDeductible: false }))];
    const calculation = calculateKenyaPayroll({
      basicSalary: asAmount(contract.basicSalary), earnings, deductions,
      adjustments, resident: contract.resident === 1, additionalPension: asAmount(contract.additionalPension),
      postRetirementMedical: asAmount(contract.postRetirementMedical), mortgageInterest: asAmount(contract.mortgageInterest),
    }, rules);
    rows.push({ schoolId, staffProfileId: staff.id, employeeName: staff.displayName, calculationJson: JSON.stringify({ ...calculation, earnings, deductions, adjustments, loanRepayments, rules, rulesEffectiveFrom: dateString(rulesRow.effectiveFrom), compensationEffectiveFrom: dateString(contract.effectiveFrom) }), gross: String(calculation.gross), paye: String(calculation.paye), net: String(calculation.netPay) });
  }
  if (!rows.length) throw new Error("NO_ACTIVE_STAFF_WITH_COMPENSATION");
  return db.transaction(async tx => {
    const runId = (await tx.insert(payrollRuns).values({ schoolId, period: input.period, status: "draft", preparedByUserId: userId }).$returningId())[0].id;
    await tx.insert(payrollItems).values(rows.map(row => ({ ...row, runId })));
    await tx.insert(auditLogs).values({ userId, action: "payroll.run.create", entityType: "payroll_run", entityId: String(runId), metadata: JSON.stringify({ period: input.period, itemCount: rows.length, rulesEffectiveFrom: dateString(rulesRow.effectiveFrom) }) });
    return { ok: true, runId, period: input.period, itemCount: rows.length };
  });
}

export async function transitionPayrollRun(input: { runId: number; action: "submit" | "approve" | "record_external_payment" | "close"; note?: string }, userId: number, role: string) {
  const permission = input.action === "submit" ? "payroll.edit" : input.action === "approve" || input.action === "close" ? "payroll.approve" : "finance.edit";
  await demand(userId, role, permission);
  const { db, schoolId } = await schoolScope();
  const run = (await db.select().from(payrollRuns).where(and(eq(payrollRuns.id, input.runId), eq(payrollRuns.schoolId, schoolId))).limit(1))[0];
  if (!run) throw new Error("PAYROLL_RUN_NOT_FOUND");
  if (input.action === "submit") {
    if (run.status !== "draft") throw new Error("PAYROLL_RUN_STATE_INVALID");
    await db.update(payrollRuns).set({ status: "submitted", submittedByUserId: userId }).where(and(eq(payrollRuns.id, run.id), eq(payrollRuns.status, "draft")));
    await writeAudit(userId, "payroll.run.submit", "payroll_run", run.id, { period: run.period });
    return { ok: true, status: "submitted" };
  }
  if (input.action === "approve") {
    if (run.status !== "submitted") throw new Error("PAYROLL_RUN_STATE_INVALID");
    if (run.preparedByUserId === userId) throw new Error("SEPARATION_OF_DUTIES_REQUIRED");
    await db.update(payrollRuns).set({ status: "approved", approvedByUserId: userId, approvedAt: new Date() }).where(and(eq(payrollRuns.id, run.id), eq(payrollRuns.status, "submitted")));
    await writeAudit(userId, "payroll.run.approve", "payroll_run", run.id, { period: run.period, note: input.note?.slice(0, 300) ?? null });
    return { ok: true, status: "approved" };
  }
  if (input.action === "record_external_payment") {
    if (run.status !== "approved" || run.preparedByUserId === userId) throw new Error("PAYROLL_RUN_NOT_APPROVED_OR_DUTIES_CONFLICT");
    const items = await db.select().from(payrollItems).where(and(eq(payrollItems.schoolId, schoolId), eq(payrollItems.runId, run.id)));
    const totalEmployerCost = money(items.reduce((sum, item) => sum + Number(JSON.parse(item.calculationJson).totalEmployerCost ?? item.gross), 0));
    if (totalEmployerCost <= 0) throw new Error("PAYROLL_RUN_TOTAL_INVALID");
    return db.transaction(async tx => {
      const expenditureId = (await tx.insert(expenditures).values({ expenditureDate: asDate(`${run.period}-28`), amount: String(totalEmployerCost), category: "Payroll", description: `External payroll disbursement recorded for ${run.period}`.slice(0, 255), responsiblePerson: "NEXUS Payroll Register", createdByUserId: userId }).$returningId())[0].id;
      const result = await tx.update(payrollRuns).set({ status: "recorded", recordedAt: new Date(), financeExpenditureId: Number(expenditureId) }).where(and(eq(payrollRuns.id, run.id), eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.status, "approved")));
      if (!result[0].affectedRows) throw new Error("PAYROLL_RUN_STATE_CONFLICT");
      let repaymentCount = 0;
      let repaymentTotal = 0;
      for (const item of items) {
        const calculation = JSON.parse(item.calculationJson);
        for (const repayment of calculation.loanRepayments ?? []) {
          const loan = (await tx.select().from(payrollLoans).where(and(eq(payrollLoans.id, repayment.loanId), eq(payrollLoans.schoolId, schoolId))).limit(1))[0];
          const oldBalance = loan ? asAmount(loan.outstandingBalance) : 0;
          const amount = money(Number(repayment.amount));
          if (!loan || loan.status !== "approved" || !Number.isFinite(amount) || amount <= 0 || amount > oldBalance) throw new Error("PAYROLL_LOAN_BALANCE_CONFLICT");
          await tx.insert(payrollLoanRepayments).values({ schoolId, loanId: loan.id, runId: run.id, amount: String(amount) });
          const newBalance = money(oldBalance - amount);
          const updatedLoan = await tx.update(payrollLoans).set({ outstandingBalance: String(newBalance), status: newBalance === 0 ? "closed" : "approved" }).where(and(eq(payrollLoans.id, loan.id), eq(payrollLoans.schoolId, schoolId), eq(payrollLoans.status, "approved"), eq(payrollLoans.outstandingBalance, loan.outstandingBalance)));
          if (!updatedLoan[0].affectedRows) throw new Error("PAYROLL_LOAN_BALANCE_CONFLICT");
          repaymentCount += 1;
          repaymentTotal = money(repaymentTotal + amount);
        }
      }
      await tx.insert(auditLogs).values({ userId, action: "payroll.run.external_payment_recorded", entityType: "payroll_run", entityId: String(run.id), metadata: JSON.stringify({ period: run.period, expenditureId: Number(expenditureId), totalEmployerCost, repaymentCount, repaymentTotal, note: input.note?.slice(0, 300) ?? null }) });
      return { ok: true, status: "recorded", expenditureId: Number(expenditureId), totalEmployerCost };
    });
  }
  if (run.status !== "recorded") throw new Error("PAYROLL_RUN_NOT_RECORDED");
  await db.update(payrollRuns).set({ status: "closed" }).where(and(eq(payrollRuns.id, run.id), eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.status, "recorded")));
  await writeAudit(userId, "payroll.run.close", "payroll_run", run.id, { period: run.period });
  return { ok: true, status: "closed" };
}
