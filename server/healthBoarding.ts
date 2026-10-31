import { and, asc, eq, sql } from "drizzle-orm";
import { healthEvents, healthProfiles, boardingAllocations, boardingProfiles, boardingUnits, boardingAttendance, boardingMeals, boardingCheckouts, learners } from "../drizzle/schema";
import { requireDb, writeAudit } from "./smis";
import { getTenantContext } from "./tenant";

export async function listHealthRecords(userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId);
  const profiles = await db.select({ profile: healthProfiles, learner: learners }).from(healthProfiles).innerJoin(learners, eq(learners.id, healthProfiles.learnerId)).where(eq(healthProfiles.schoolId, tenant.schoolId)).orderBy(asc(learners.fullName));
  const events = await db.select({ event: healthEvents, learner: learners }).from(healthEvents).innerJoin(learners, eq(learners.id, healthEvents.learnerId)).where(eq(healthEvents.schoolId, tenant.schoolId)).orderBy(sql`${healthEvents.eventDate} desc`).limit(100);
  return { profiles, events };
}

export async function getHealthProfile(learnerId: number, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId);
  const learner = (await db.select().from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, tenant.schoolId))).limit(1))[0];
  if (!learner) throw new Error("LEARNER_NOT_FOUND");
  const profile = (await db.select().from(healthProfiles).where(and(eq(healthProfiles.learnerId, learnerId), eq(healthProfiles.schoolId, tenant.schoolId))).limit(1))[0] ?? null;
  return profile ? { profile, learner } : null;
}

export async function saveHealthProfile(input: { learnerId: number; allergies?: string | null; conditions?: string | null; bloodGroup?: string | null; emergencyContactName?: string | null; emergencyContactPhone?: string | null; providerNotes?: string | null }, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId);
  const learner = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, input.learnerId), eq(learners.schoolId, tenant.schoolId))).limit(1))[0]; if (!learner) throw new Error("LEARNER_NOT_FOUND");
  const existing = (await db.select({ id: healthProfiles.id }).from(healthProfiles).where(and(eq(healthProfiles.schoolId, tenant.schoolId), eq(healthProfiles.learnerId, input.learnerId))).limit(1))[0];
  if (existing) await db.update(healthProfiles).set({ ...input, updatedByUserId: userId }).where(eq(healthProfiles.id, existing.id)); else await db.insert(healthProfiles).values({ ...input, schoolId: tenant.schoolId, learnerId: input.learnerId, updatedByUserId: userId });
  await writeAudit(userId, "health.profile.save", "health_profile", existing?.id ?? null, { learnerId: input.learnerId }); return { ok: true };
}

export async function recordHealthEvent(input: { learnerId: number; eventType: "illness" | "injury" | "first_aid" | "clinic_visit" | "referral" | "follow_up"; eventDate: string; notes: string; medication?: string | null; referredTo?: string | null }, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId);
  const learner = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, input.learnerId), eq(learners.schoolId, tenant.schoolId))).limit(1))[0]; if (!learner) throw new Error("LEARNER_NOT_FOUND");
  const result = await db.insert(healthEvents).values({ ...input, eventDate: new Date(input.eventDate), schoolId: tenant.schoolId, recordedByUserId: userId });
  await writeAudit(userId, "health.event.create", "health_event", String(result[0].insertId), { learnerId: input.learnerId, eventType: input.eventType }); return { id: Number(result[0].insertId) };
}

export async function listBoardingRecords(userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId);
  const profiles = await db.select({ profile: boardingProfiles, learner: learners }).from(boardingProfiles).innerJoin(learners, eq(learners.id, boardingProfiles.learnerId)).where(eq(boardingProfiles.schoolId, tenant.schoolId)).orderBy(asc(learners.fullName));
  const units = await db.select().from(boardingUnits).where(eq(boardingUnits.schoolId, tenant.schoolId)).orderBy(asc(boardingUnits.name));
  const allocations = await db.select({ allocation: boardingAllocations, learner: learners, unit: boardingUnits }).from(boardingAllocations).innerJoin(learners, eq(learners.id, boardingAllocations.learnerId)).innerJoin(boardingUnits, eq(boardingUnits.id, boardingAllocations.unitId)).where(and(eq(boardingAllocations.schoolId, tenant.schoolId), eq(boardingAllocations.status, "active")));
  const attendance = await db.select({ record: boardingAttendance, learner: learners }).from(boardingAttendance).innerJoin(learners, eq(learners.id, boardingAttendance.learnerId)).where(eq(boardingAttendance.schoolId, tenant.schoolId)).orderBy(sql`${boardingAttendance.attendanceDate} desc`).limit(200);
  const meals = await db.select({ record: boardingMeals, learner: learners }).from(boardingMeals).innerJoin(learners, eq(learners.id, boardingMeals.learnerId)).where(eq(boardingMeals.schoolId, tenant.schoolId)).orderBy(sql`${boardingMeals.mealDate} desc`).limit(200);
  const checkouts = await db.select({ record: boardingCheckouts, learner: learners }).from(boardingCheckouts).innerJoin(learners, eq(learners.id, boardingCheckouts.learnerId)).where(eq(boardingCheckouts.schoolId, tenant.schoolId)).orderBy(sql`${boardingCheckouts.checkoutAt} desc`).limit(200);
  return { profiles, units, allocations, attendance, meals, checkouts };
}

export async function saveBoardingProfile(input: { learnerId: number; residentialStatus: "day_scholar" | "full_time_boarder" | "weekly_boarder" | "scheduled_boarder"; dietaryRequirements?: string | null; activeFrom: string }, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId);
  const learner = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, input.learnerId), eq(learners.schoolId, tenant.schoolId))).limit(1))[0]; if (!learner) throw new Error("LEARNER_NOT_FOUND");
  const existing = (await db.select({ id: boardingProfiles.id }).from(boardingProfiles).where(and(eq(boardingProfiles.schoolId, tenant.schoolId), eq(boardingProfiles.learnerId, input.learnerId))).limit(1))[0];
  if (existing) await db.update(boardingProfiles).set({ ...input, activeFrom: new Date(input.activeFrom), updatedByUserId: userId }).where(eq(boardingProfiles.id, existing.id)); else await db.insert(boardingProfiles).values({ ...input, activeFrom: new Date(input.activeFrom), schoolId: tenant.schoolId, learnerId: input.learnerId, updatedByUserId: userId });
  await writeAudit(userId, "boarding.profile.save", "boarding_profile", existing?.id ?? null, { learnerId: input.learnerId }); return { ok: true };
}

export async function createBoardingUnit(input: { name: string; room?: string | null; capacity: number }, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId); if (input.capacity < 1) throw new Error("CAPACITY_REQUIRED");
  const result = await db.insert(boardingUnits).values({ ...input, schoolId: tenant.schoolId, createdByUserId: userId }); await writeAudit(userId, "boarding.unit.create", "boarding_unit", String(result[0].insertId), input); return { id: Number(result[0].insertId) };
}

export async function allocateBoardingBed(input: { learnerId: number; unitId: number; allocatedFrom: string }, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId);
  const learner = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, input.learnerId), eq(learners.schoolId, tenant.schoolId))).limit(1))[0]; if (!learner) throw new Error("LEARNER_NOT_FOUND");
  const unit = (await db.select().from(boardingUnits).where(and(eq(boardingUnits.id, input.unitId), eq(boardingUnits.schoolId, tenant.schoolId), eq(boardingUnits.status, "active"))).limit(1))[0]; if (!unit) throw new Error("BOARDING_UNIT_NOT_FOUND");
  const current = (await db.select({ id: boardingAllocations.id }).from(boardingAllocations).where(and(eq(boardingAllocations.schoolId, tenant.schoolId), eq(boardingAllocations.learnerId, input.learnerId), eq(boardingAllocations.status, "active"))).limit(1))[0]; if (current) throw new Error("LEARNER_ALREADY_ALLOCATED");
  const occupants = await db.select({ id: boardingAllocations.id }).from(boardingAllocations).where(and(eq(boardingAllocations.schoolId, tenant.schoolId), eq(boardingAllocations.unitId, input.unitId), eq(boardingAllocations.status, "active"))); if (occupants.length >= unit.capacity) throw new Error("BOARDING_CAPACITY_REACHED");
  const result = await db.insert(boardingAllocations).values({ ...input, allocatedFrom: new Date(input.allocatedFrom), schoolId: tenant.schoolId, allocatedByUserId: userId }); await writeAudit(userId, "boarding.bed.allocate", "boarding_allocation", String(result[0].insertId), input); return { id: Number(result[0].insertId) };
}

async function boardingLearner(learnerId: number, schoolId: number) {
  const db = await requireDb(); const learner = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, learnerId), eq(learners.schoolId, schoolId))).limit(1))[0]; if (!learner) throw new Error("LEARNER_NOT_FOUND");
}

export async function recordBoardingAttendance(input: { learnerId: number; attendanceDate: string; status: "present" | "absent" | "late" | "excused"; notes?: string | null }, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId); await boardingLearner(input.learnerId, tenant.schoolId); const day = new Date(input.attendanceDate);
  const existing = (await db.select({ id: boardingAttendance.id }).from(boardingAttendance).where(and(eq(boardingAttendance.schoolId, tenant.schoolId), eq(boardingAttendance.learnerId, input.learnerId), eq(boardingAttendance.attendanceDate, day))).limit(1))[0];
  if (existing) await db.update(boardingAttendance).set({ status: input.status, notes: input.notes ?? null, recordedByUserId: userId }).where(eq(boardingAttendance.id, existing.id)); else await db.insert(boardingAttendance).values({ schoolId: tenant.schoolId, learnerId: input.learnerId, attendanceDate: day, status: input.status, notes: input.notes ?? null, recordedByUserId: userId });
  await writeAudit(userId, "boarding.attendance.save", "boarding_attendance", existing?.id ?? null, { learnerId: input.learnerId, attendanceDate: input.attendanceDate }); return { ok: true };
}

export async function recordBoardingMeal(input: { learnerId: number; mealDate: string; mealType: "breakfast" | "lunch" | "dinner" | "snack"; status: "served" | "skipped" | "excused"; notes?: string | null }, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId); await boardingLearner(input.learnerId, tenant.schoolId); const day = new Date(input.mealDate);
  const existing = (await db.select({ id: boardingMeals.id }).from(boardingMeals).where(and(eq(boardingMeals.schoolId, tenant.schoolId), eq(boardingMeals.learnerId, input.learnerId), eq(boardingMeals.mealDate, day), eq(boardingMeals.mealType, input.mealType))).limit(1))[0];
  if (existing) await db.update(boardingMeals).set({ status: input.status, notes: input.notes ?? null, recordedByUserId: userId }).where(eq(boardingMeals.id, existing.id)); else await db.insert(boardingMeals).values({ schoolId: tenant.schoolId, learnerId: input.learnerId, mealDate: day, mealType: input.mealType, status: input.status, notes: input.notes ?? null, recordedByUserId: userId });
  await writeAudit(userId, "boarding.meal.save", "boarding_meal", existing?.id ?? null, { learnerId: input.learnerId, mealDate: input.mealDate, mealType: input.mealType }); return { ok: true };
}

export async function checkoutBoarder(input: { learnerId: number; checkoutAt: string; expectedReturnAt?: string | null; destination?: string | null; reason: string; notes?: string | null }, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId); await boardingLearner(input.learnerId, tenant.schoolId);
  const active = (await db.select({ id: boardingCheckouts.id }).from(boardingCheckouts).where(and(eq(boardingCheckouts.schoolId, tenant.schoolId), eq(boardingCheckouts.learnerId, input.learnerId), eq(boardingCheckouts.status, "checked_out"))).limit(1))[0]; if (active) throw new Error("LEARNER_ALREADY_CHECKED_OUT");
  const result = await db.insert(boardingCheckouts).values({ schoolId: tenant.schoolId, learnerId: input.learnerId, checkoutAt: new Date(input.checkoutAt), expectedReturnAt: input.expectedReturnAt ? new Date(input.expectedReturnAt) : null, destination: input.destination ?? null, reason: input.reason, notes: input.notes ?? null, authorizedByUserId: userId }); await writeAudit(userId, "boarding.checkout.create", "boarding_checkout", String(result[0].insertId), { learnerId: input.learnerId }); return { id: Number(result[0].insertId) };
}

export async function returnBoarder(checkoutId: number, userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId); const row = (await db.select({ id: boardingCheckouts.id }).from(boardingCheckouts).where(and(eq(boardingCheckouts.id, checkoutId), eq(boardingCheckouts.schoolId, tenant.schoolId), eq(boardingCheckouts.status, "checked_out"))).limit(1))[0]; if (!row) throw new Error("CHECKOUT_NOT_FOUND");
  await db.update(boardingCheckouts).set({ status: "returned", actualReturnAt: new Date(), returnedByUserId: userId }).where(eq(boardingCheckouts.id, checkoutId)); await writeAudit(userId, "boarding.checkout.return", "boarding_checkout", checkoutId, {}); return { ok: true };
}
