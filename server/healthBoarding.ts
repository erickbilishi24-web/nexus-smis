import { and, asc, eq, sql } from "drizzle-orm";
import { healthEvents, healthProfiles, boardingAllocations, boardingProfiles, boardingUnits, learners } from "../drizzle/schema";
import { requireDb, writeAudit } from "./smis";
import { getTenantContext } from "./tenant";

export async function listHealthRecords(userId: number) {
  const db = await requireDb(); const tenant = await getTenantContext(userId);
  const profiles = await db.select({ profile: healthProfiles, learner: learners }).from(healthProfiles).innerJoin(learners, eq(learners.id, healthProfiles.learnerId)).where(eq(healthProfiles.schoolId, tenant.schoolId)).orderBy(asc(learners.fullName));
  const events = await db.select({ event: healthEvents, learner: learners }).from(healthEvents).innerJoin(learners, eq(learners.id, healthEvents.learnerId)).where(eq(healthEvents.schoolId, tenant.schoolId)).orderBy(sql`${healthEvents.eventDate} desc`).limit(100);
  return { profiles, events };
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
  return { profiles, units, allocations };
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
