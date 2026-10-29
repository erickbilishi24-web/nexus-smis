import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb } from "./db";
import { actorSchoolId, writeAudit } from "./smis";
import { grades, learnerLeaveOutPasses, learners, users } from "../drizzle/schema";

type LeaveOutStatus = "draft" | "pending_approval" | "approved" | "rejected" | "departed" | "returned" | "cancelled" | "expired";

async function dbOrThrow() { const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE"); return db; }

async function nextPassNumber(schoolId: number) {
  const db = await dbOrThrow();
  const year = new Date().getFullYear();
  const rows = await db.select({ passNumber: learnerLeaveOutPasses.passNumber }).from(learnerLeaveOutPasses).where(eq(learnerLeaveOutPasses.schoolId, schoolId)).orderBy(desc(learnerLeaveOutPasses.id)).limit(1);
  const last = rows[0]?.passNumber?.match(/-(\d+)$/)?.[1];
  return `LOP-${year}-${String(Number(last ?? 0) + 1).padStart(5, "0")}`;
}

export async function listLeaveOutPasses(userId: number, status?: LeaveOutStatus) {
  const db = await dbOrThrow(); const schoolId = await actorSchoolId(userId);
  const rows = await db.select({ pass: learnerLeaveOutPasses, learner: learners, grade: grades })
    .from(learnerLeaveOutPasses).innerJoin(learners, eq(learners.id, learnerLeaveOutPasses.learnerId)).leftJoin(grades, eq(grades.id, learners.gradeId))
    .where(and(eq(learnerLeaveOutPasses.schoolId, schoolId), status ? eq(learnerLeaveOutPasses.status, status) : undefined))
    .orderBy(desc(learnerLeaveOutPasses.createdAt));
  return rows;
}

export async function createLeaveOutPass(input: { learnerId: number; reason: string; intendedDepartureAt: string; expectedReturnAt?: string | null; destination?: string | null; collectorName?: string | null; collectorRelationship?: string | null; collectorVerification?: string | null; guardianVerified?: boolean; remarks?: string | null }, userId: number) {
  const db = await dbOrThrow(); const schoolId = await actorSchoolId(userId);
  const learner = (await db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(and(eq(learners.id, input.learnerId), eq(learners.schoolId, schoolId), eq(learners.status, "active"))).limit(1))[0];
  if (!learner) throw new Error("LEARNER_NOT_FOUND_IN_SCHOOL");
  const departure = new Date(input.intendedDepartureAt); if (Number.isNaN(departure.getTime())) throw new Error("INVALID_DEPARTURE_TIME");
  const active = await db.select({ id: learnerLeaveOutPasses.id }).from(learnerLeaveOutPasses).where(and(eq(learnerLeaveOutPasses.schoolId, schoolId), eq(learnerLeaveOutPasses.learnerId, input.learnerId), inArray(learnerLeaveOutPasses.status, ["pending_approval", "approved", "departed"]))).limit(1);
  if (active.length) throw new Error("ACTIVE_LEAVE_OUT_PASS_EXISTS");
  const passNumber = await nextPassNumber(schoolId);
  const result = await db.insert(learnerLeaveOutPasses).values({ schoolId, learnerId: input.learnerId, passNumber, reason: input.reason.trim(), intendedDepartureAt: departure, expectedReturnAt: input.expectedReturnAt ? new Date(input.expectedReturnAt) : null, destination: input.destination?.trim() || null, collectorName: input.collectorName?.trim() || null, collectorRelationship: input.collectorRelationship?.trim() || null, collectorVerification: input.collectorVerification?.trim() || null, guardianVerified: input.guardianVerified ? 1 : 0, initiatedByUserId: userId, remarks: input.remarks?.trim() || null });
  await writeAudit(userId, "leave_out.create", "learner_leave_out_pass", result[0].insertId, { passNumber, learnerId: input.learnerId, guardianVerified: Boolean(input.guardianVerified) });
  return { id: Number(result[0].insertId), passNumber };
}

export async function transitionLeaveOutPass(input: { passId: number; action: "approve" | "reject" | "cancel" | "depart" | "return"; remarks?: string | null }, userId: number) {
  const db = await dbOrThrow(); const schoolId = await actorSchoolId(userId);
  const current = (await db.select().from(learnerLeaveOutPasses).where(and(eq(learnerLeaveOutPasses.id, input.passId), eq(learnerLeaveOutPasses.schoolId, schoolId))).limit(1))[0];
  if (!current) throw new Error("LEAVE_OUT_PASS_NOT_FOUND");
  const now = new Date(); const patch: Partial<typeof learnerLeaveOutPasses.$inferInsert> = { remarks: input.remarks?.trim() || current.remarks };
  const next: Record<typeof input.action, LeaveOutStatus> = { approve: "approved", reject: "rejected", cancel: "cancelled", depart: "departed", return: "returned" };
  const allowed: Record<typeof input.action, LeaveOutStatus[]> = { approve: ["pending_approval"], reject: ["pending_approval"], cancel: ["draft", "pending_approval", "approved"], depart: ["approved"], return: ["departed"] };
  if (!allowed[input.action].includes(current.status as LeaveOutStatus)) throw new Error("INVALID_LEAVE_OUT_TRANSITION");
  patch.status = next[input.action];
  if (input.action === "approve") { patch.approvedByUserId = userId; patch.approvedAt = now; }
  if (input.action === "depart") { patch.departedByUserId = userId; patch.departedAt = now; }
  if (input.action === "return") { patch.returnedByUserId = userId; patch.returnedAt = now; }
  await db.update(learnerLeaveOutPasses).set(patch).where(and(eq(learnerLeaveOutPasses.id, input.passId), eq(learnerLeaveOutPasses.schoolId, schoolId)));
  await writeAudit(userId, `leave_out.${input.action}`, "learner_leave_out_pass", input.passId, { from: current.status, to: next[input.action] });
  return { ok: true, status: next[input.action] };
}
