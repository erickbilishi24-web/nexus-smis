import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import { alumni, behaviourRecords, counsellingCases, counsellingFollowUps, counsellingNotes, feeStructures, grades, learnerEnrolments, learnerExits, learners, payments, reportCards } from "../drizzle/schema";
import { getDb } from "./db";
import { writeAudit } from "./smis";
import { getAccessProfile } from "./access";

const dbOrThrow = async () => { const db = await getDb(); if (!db) throw new Error("DATABASE_NOT_CONFIGURED"); return db; };

export async function listArchiveLearners(input: { search?: string; year?: number; status?: string }) {
  const db = await dbOrThrow();
  const search = input.search?.trim();
  const filters = [] as ReturnType<typeof eq>[];
  if (search) filters.push(or(like(learners.fullName, `%${search}%`), like(learners.admissionNumber, `%${search}%`))!);
  if (input.status && ["active", "inactive", "archived"].includes(input.status)) filters.push(eq(learners.status, input.status as "active" | "inactive" | "archived"));
  const rows = await db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(filters.length ? and(...filters) : undefined).orderBy(learners.fullName);
  const exits = await db.select().from(learnerExits).orderBy(desc(learnerExits.effectiveDate));
  const enrolments = input.year ? await db.select().from(learnerEnrolments).where(eq(learnerEnrolments.academicYearId, input.year)) : [];
  return rows.map(row => ({ ...row.learner, grade: row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "", exit: exits.find(exit => exit.learnerId === row.learner.id) ?? null, enrolment: enrolments.find(enrolment => enrolment.learnerId === row.learner.id) ?? null }));
}

export async function listAlumniRecords(input: { year?: number; search?: string }) {
  const db = await dbOrThrow();
  const rows = await db.select({ alumni: alumni, learner: learners, grade: grades }).from(alumni).innerJoin(learners, eq(learners.id, alumni.learnerId)).leftJoin(grades, eq(grades.id, alumni.finalGradeId)).where(input.year ? eq(alumni.completionYear, input.year) : undefined).orderBy(desc(alumni.completionYear), learners.fullName);
  const search = input.search?.trim().toLowerCase();
  return rows.filter(row => !search || row.learner.fullName.toLowerCase().includes(search) || row.learner.admissionNumber.toLowerCase().includes(search)).map(row => ({ ...row.alumni, learner: row.learner, finalGrade: row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : row.alumni.finalClassName }));
}

export async function completeLearner(input: { learnerId: number; status: "completed" | "graduated" | "transferred" | "withdrawn" | "other"; effectiveDate: string; reason: string; finalGradeId?: number; notes?: string; destination?: string }, userId: number) {
  const db = await dbOrThrow();
  const learner = (await db.select().from(learners).where(eq(learners.id, input.learnerId)).limit(1))[0];
  if (!learner) throw new Error("LEARNER_NOT_FOUND");
  const exit = (await db.insert(learnerExits).values({ learnerId: input.learnerId, status: input.status, effectiveDate: new Date(input.effectiveDate), reason: input.reason.trim(), finalGradeId: input.finalGradeId ?? learner.gradeId, notes: input.notes?.trim() || null, processedByUserId: userId }).$returningId())[0];
  await db.update(learners).set({ status: input.status === "withdrawn" || input.status === "transferred" ? "inactive" : "archived" }).where(eq(learners.id, input.learnerId));
  const year = Number(input.effectiveDate.slice(0, 4));
  if (["completed", "graduated"].includes(input.status)) {
    await db.insert(alumni).values({ learnerId: input.learnerId, completionYear: year, finalGradeId: input.finalGradeId ?? learner.gradeId, finalClassName: null, completionStatus: input.status, completionDate: new Date(input.effectiveDate), destination: input.destination?.trim() || null, archivedByUserId: userId }).onDuplicateKeyUpdate({ set: { completionYear: year, finalGradeId: input.finalGradeId ?? learner.gradeId, completionStatus: input.status, completionDate: new Date(input.effectiveDate), destination: input.destination?.trim() || null, archivedByUserId: userId } });
  }
  await writeAudit(userId, "learner.exit.processed", "learner", input.learnerId, { status: input.status, effectiveDate: input.effectiveDate, exitId: exit.id });
  return { exitId: exit.id, learnerId: input.learnerId, status: input.status };
}

export async function getArchiveFinance(learnerId: number) {
  const db = await dbOrThrow();
  const learner = (await db.select().from(learners).where(eq(learners.id, learnerId)).limit(1))[0];
  if (!learner) throw new Error("LEARNER_NOT_FOUND");
  const fees = await db.select().from(feeStructures).where(eq(feeStructures.gradeId, learner.gradeId));
  const learnerPayments = await db.select().from(payments).where(eq(payments.learnerId, learnerId)).orderBy(desc(payments.paidAt));
  const billed = fees.reduce((sum, fee) => sum + Number(fee.amount), 0);
  const paid = learnerPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  return { learnerId, billed, paid, balance: billed - paid, payments: learnerPayments };
}

export async function listCounsellingCases(includeArchived: boolean, userId?: number) {
  const db = await dbOrThrow();
  const filters = includeArchived ? undefined : or(eq(counsellingCases.status, "open"), eq(counsellingCases.status, "in_progress"));
  const rows = await db.select({ case: counsellingCases, learner: learners }).from(counsellingCases).innerJoin(learners, eq(learners.id, counsellingCases.learnerId)).where(filters).orderBy(desc(counsellingCases.updatedAt));
  const profile = userId ? await getAccessProfile(userId) : null;
  return rows.filter(row => !profile || profile.level !== "class" || profile.gradeIds.includes(row.learner.gradeId ?? -1)).map(row => ({ ...row.case, learner: row.learner }));
}

export async function createCounsellingCase(input: { learnerId: number; concern: string; referralSource?: string; assignedCounsellorUserId?: number; reviewDate?: string }, userId: number) {
  const db = await dbOrThrow();
  const learner = (await db.select().from(learners).where(eq(learners.id, input.learnerId)).limit(1))[0];
  if (!learner) throw new Error("LEARNER_NOT_FOUND");
  const profile = await getAccessProfile(userId);
  if (profile.level === "class" && !profile.gradeIds.includes(learner.gradeId ?? -1)) throw new Error("COUNSELLING_SCOPE_FORBIDDEN");
  const result = (await db.insert(counsellingCases).values({ learnerId: input.learnerId, concern: input.concern.trim(), referralSource: input.referralSource?.trim() || "staff", assignedCounsellorUserId: input.assignedCounsellorUserId ?? null, reviewDate: input.reviewDate ? new Date(input.reviewDate) : null, createdByUserId: userId }).$returningId())[0];
  await writeAudit(userId, "counselling.case.created", "counselling_case", result.id, { learnerId: input.learnerId });
  return result;
}

export async function addCounsellingNote(input: { caseId: number; note: string }, userId: number) {
  const db = await dbOrThrow();
  const result = (await db.insert(counsellingNotes).values({ caseId: input.caseId, note: input.note.trim(), createdByUserId: userId }).$returningId())[0];
  await writeAudit(userId, "counselling.note.created", "counselling_case", input.caseId, { confidential: true });
  return result;
}

export async function createFollowUp(input: { caseId: number; scheduledFor: string; action: string }, userId: number) {
  const db = await dbOrThrow();
  return (await db.insert(counsellingFollowUps).values({ caseId: input.caseId, scheduledFor: new Date(input.scheduledFor), action: input.action.trim(), createdByUserId: userId }).$returningId())[0];
}

export async function createBehaviourRecord(input: { learnerId: number; category: string; summary: string; outcome?: string; isApprovedForReport?: boolean }, userId: number) {
  const db = await dbOrThrow();
  return (await db.insert(behaviourRecords).values({ learnerId: input.learnerId, category: input.category.trim(), summary: input.summary.trim(), outcome: input.outcome?.trim() || null, isApprovedForReport: input.isApprovedForReport ? 1 : 0, recordedByUserId: userId }).$returningId())[0];
}

export async function listApprovedBehaviour(learnerId: number) {
  const db = await dbOrThrow();
  return db.select().from(behaviourRecords).where(and(eq(behaviourRecords.learnerId, learnerId), eq(behaviourRecords.isApprovedForReport, 1))).orderBy(desc(behaviourRecords.createdAt));
}
