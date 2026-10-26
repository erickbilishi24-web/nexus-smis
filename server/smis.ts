import { and, count, desc, eq, gte, inArray, like, lte, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { computePermissions } from "./access";
import { curriculumCatalogue } from "./curriculum";
import { attendanceGradeLevel, validateAttendanceBatch, type AttendanceBatchEntry } from "../shared/attendance";
import {
  alumni,
  assessments,
  attendanceRegisterApprovals,
  attendances,
  auditLogs,
  communications,
  curriculumOfferings,
  expenditures,
  guardians,
  learnerGuardians,
  feeStructures,
  grades,
  learners,
  marks,
  notifications,
  payments,
  reportCards,
  permissions,
  schoolSettings,
  staffProfiles,
  staffClockings,
  storeItems,
  storeMovements,
  subjects,
  teacherAllocations,
  timetableEntries,
  timetableRequirements,
  userPermissions,
  users,
} from "../drizzle/schema";

export const permissionsByRole: Record<string, string[]> = {
  super_admin: ["*"],
  admin: ["dashboard.view", "learners.view", "learners.add", "learners.edit", "learners.deactivate", "attendance.view", "attendance.edit", "assessments.view", "assessments.edit", "reports.view", "finance.view", "finance.edit", "payroll.view", "payroll.edit", "payroll.approve", "payroll.rules", "transport.view", "transport.edit", "transport.manage", "store.view", "store.edit", "timetable.view", "timetable.edit", "communication.edit", "alumni.edit", "archives.view", "archives.edit", "counselling.submit", "users.edit", "settings.edit", "audit.view", "allocations.view", "allocations.create", "allocations.edit", "allocations.deactivate", "allocations.replace", "allocations.bulk"],
  teacher: ["dashboard.view", "attendance.view", "assessments.view", "assessments.edit", "counselling.submit", "timetable.view", "allocations.view"],
  class_teacher: ["dashboard.view", "attendance.view", "attendance.edit", "assessments.view", "assessments.edit", "reports.view", "counselling.submit", "timetable.view", "allocations.view"],
  finance: ["dashboard.view", "finance.view", "finance.edit", "attendance.view", "attendance.edit"],
  storekeeper: ["dashboard.view", "store.view", "store.edit"],
  other: ["dashboard.view"],
};

export const permissionCatalog = [
  ["learners.view", "View learners"], ["learners.add", "Add learners"], ["learners.edit", "Edit learners"], ["learners.deactivate", "Deactivate learners"],
  ["attendance.view", "View attendance"], ["attendance.edit", "Enter and edit attendance"], ["assessments.view", "View marks"], ["assessments.edit", "Enter and edit marks"],
  ["reports.view", "View reports"], ["finance.view", "View finance"], ["finance.edit", "Record payments and expenditure"], ["payroll.view", "View confidential payroll records"], ["payroll.edit", "Prepare payroll and adjustments"], ["payroll.approve", "Approve payroll independently"], ["payroll.rules", "Configure payroll statutory rules"], ["transport.view", "View transport and fleet"], ["transport.edit", "Run transport operations"], ["transport.manage", "Manage fleet and routes"], ["store.view", "View inventory"], ["store.edit", "Manage inventory"],
  ["timetable.view", "View timetable"], ["timetable.edit", "Edit timetable"], ["allocations.view", "View teacher allocations"], ["allocations.create", "Create allocations"], ["allocations.edit", "Edit allocations"], ["allocations.deactivate", "Deactivate allocations"], ["allocations.replace", "Replace teachers"], ["allocations.bulk", "Bulk allocation"], ["communication.edit", "Manage communication"], ["alumni.edit", "Manage alumni"], ["archives.view", "View academic archives and alumni"], ["archives.edit", "Process learner exits"], ["counselling.submit", "Submit counselling referrals"], ["counselling.view", "View confidential counselling cases"], ["counselling.edit", "Manage confidential counselling cases"], ["users.edit", "Manage users"], ["settings.edit", "Manage settings"], ["ai.access", "Access NEXUS AI"], ["audit.view", "View audit logs"],
] as const;

export async function effectivePermissions(userId: number, role: string) {
  return computePermissions(userId, role);
}

export async function userCan(userId: number, role: string, permission: string) {
  const permissions = await effectivePermissions(userId, role);
  return permissions.includes("*") || permissions.includes(permission);
}

export function cbcLevel(score: number) {
  if (score >= 90) return "EE1";
  if (score >= 75) return "EE2";
  if (score >= 58) return "ME1";
  if (score >= 41) return "ME2";
  if (score >= 31) return "AE1";
  if (score >= 21) return "AE2";
  if (score >= 11) return "BE1";
  return "BE2";
}

export function assertScore(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error("Score must be between 0 and 100");
  return Math.round(value * 100) / 100;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db;
}

export async function actorSchoolId(userId: number): Promise<number> {
  const db = await requireDb();
  const row = (await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!row?.schoolId) throw new Error("SCHOOL_ASSIGNMENT_REQUIRED");
  return row.schoolId;
}

export async function writeAudit(userId: number | null, action: string, entityType: string, entityId?: string | number | null, metadata: Record<string, unknown> = {}) {
  const db = await requireDb();
  const schoolId = userId == null ? null : (await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, userId)).limit(1))[0]?.schoolId ?? null;
  await db.insert(auditLogs).values({
    userId,
    schoolId,
    action,
    entityType,
    entityId: entityId == null ? null : String(entityId),
    metadata: JSON.stringify(metadata),
  });
}

export async function getSettings(schoolId?: number | null) {
  const db = await requireDb();
  const row = (schoolId == null
    ? await db.select().from(schoolSettings).limit(1)
    : await db.select().from(schoolSettings).where(eq(schoolSettings.schoolId, schoolId)).limit(1))[0];
  const defaults = { id: 0, schoolName: "Ebunangwe Junior School", motto: "Learn. Lead. Serve.", currentTerm: "Term 2", academicYear: 2026, includeFeesOnReportCard: 1, showPercentagesOnReportCard: 0, logoPath: null, principalSignaturePath: null, classTeacherSignaturePath: null, subjectShortNames: {} };
  if (!row) return defaults;
  let subjectShortNames: Record<string, string> = {};
  try { subjectShortNames = row.subjectShortNames ? JSON.parse(row.subjectShortNames) : {}; } catch { subjectShortNames = {}; }
  return { ...row, subjectShortNames };
}

export async function getDashboardSnapshot(userId?: number, accountRole?: string) {
  const db = await requireDb();
  const actorSchoolId = userId == null ? null : (await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, userId)).limit(1))[0]?.schoolId ?? null;
  const canViewFinance = userId == null ? true : await userCan(userId, accountRole ?? "user", "finance.view");
  const trendStart = new Date(); trendStart.setHours(0, 0, 0, 0); trendStart.setDate(trendStart.getDate() - 6);
  const [settings, learnerRows, attendanceRows, trendRows, paymentRows, paymentTrendRows, assessmentRows, staffRows, staffClockingRows, lowStockRows] = await Promise.all([
    getSettings(actorSchoolId),
    db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(and(eq(learners.status, "active"), actorSchoolId == null ? undefined : eq(learners.schoolId, actorSchoolId))),
    db.select().from(attendances).where(actorSchoolId == null ? undefined : eq(attendances.schoolId, actorSchoolId)).orderBy(desc(attendances.id)).limit(100),
    db.select({ attendanceDate: attendances.attendanceDate, status: attendances.status }).from(attendances).where(and(gte(attendances.attendanceDate, trendStart), actorSchoolId == null ? undefined : eq(attendances.schoolId, actorSchoolId))),
    canViewFinance ? db.select().from(payments).where(actorSchoolId == null ? undefined : eq(payments.schoolId, actorSchoolId)).orderBy(desc(payments.paidAt)).limit(100) : Promise.resolve([]),
    canViewFinance ? db.select({ amount: payments.amount, paidAt: payments.paidAt }).from(payments).where(and(gte(payments.paidAt, trendStart), actorSchoolId == null ? undefined : eq(payments.schoolId, actorSchoolId))) : Promise.resolve([]),
    db.select().from(assessments).where(and(sql`${assessments.status} <> 'approved'`, actorSchoolId == null ? undefined : eq(assessments.schoolId, actorSchoolId))),
    db.select().from(staffProfiles).where(and(eq(staffProfiles.status, "active"), actorSchoolId == null ? undefined : eq(staffProfiles.schoolId, actorSchoolId))),
    db.select({ userId: staffClockings.userId }).from(staffClockings).where(and(eq(staffClockings.clockDate, new Date(new Date().toISOString().slice(0, 10))), actorSchoolId == null ? undefined : eq(staffClockings.schoolId, actorSchoolId))),
    db.select({ item: storeItems, movement: storeMovements }).from(storeItems).leftJoin(storeMovements, eq(storeMovements.itemId, storeItems.id)).where(actorSchoolId == null ? undefined : eq(storeItems.schoolId, actorSchoolId)),
  ]);
  const attendanceToday = attendanceRows.filter(row => String(row.attendanceDate) === new Date().toISOString().slice(0, 10));
  const present = attendanceToday.filter(row => row.status === "present").length;
  const attendanceRate = attendanceToday.length ? Math.round((present / attendanceToday.length) * 1000) / 10 : 0;
  const attendanceTrend = Array.from({ length: 7 }, (_, index) => { const date = new Date(trendStart); date.setDate(trendStart.getDate() + index); const label = date.toISOString().slice(0, 10); const rows = trendRows.filter(row => String(row.attendanceDate) === label); return { label, present: rows.filter(row => row.status === "present" || row.status === "late").length, absent: rows.filter(row => row.status === "absent").length }; });
  const learnersById = new Map(learnerRows.map(row => [row.learner.id, row]));
  const byGrade = new Map<string, number>(); const byGender = new Map<string, number>();
  for (const row of learnerRows) { const gradeLabel = row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "Unassigned"; byGrade.set(gradeLabel, (byGrade.get(gradeLabel) ?? 0) + 1); const genderLabel = row.learner.gender === "male" ? "Boys" : row.learner.gender === "female" ? "Girls" : "Other / not recorded"; byGender.set(genderLabel, (byGender.get(genderLabel) ?? 0) + 1); }
  const learnerDistribution = Array.from(byGrade, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  const genderDistribution = Array.from(byGender, ([label, count]) => ({ label, count }));
  const newEnrollmentsThisMonth = learnerRows.filter(row => { const created = new Date(row.learner.createdAt); const now = new Date(); return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth(); }).length;
  const recentAttendance = attendanceToday.slice(0, 8).flatMap(attendance => {
    const row = learnersById.get(attendance.learnerId);
    return row ? [{ attendance, learner: row.learner, grade: row.grade }] : [];
  });
  const collections = paymentRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const collectionTrend = Array.from({ length: 7 }, (_, index) => { const date = new Date(trendStart); date.setDate(trendStart.getDate() + index); const label = date.toISOString().slice(0, 10); return { label, amount: paymentTrendRows.filter(row => new Date(row.paidAt).toISOString().slice(0, 10) === label).reduce((sum, row) => sum + Number(row.amount), 0) }; });
  const staffOnDuty = new Set(staffClockingRows.map(row => row.userId)).size;
  const stock = new Map<number, { name: string; unit: string; quantity: number; reorderLevel: number }>();
  for (const row of lowStockRows) {
    if (!row.item) continue;
    const current = stock.get(row.item.id) ?? { name: row.item.name, unit: row.item.unit, quantity: 0, reorderLevel: Number(row.item.reorderLevel) };
    if (row.movement) current.quantity += row.movement.movementType === "issued" ? -Number(row.movement.quantity) : Number(row.movement.quantity);
    stock.set(row.item.id, current);
  }
  return {
    school: settings,
    counts: { learners: learnerRows.length, staff: staffRows.length, assessmentsPending: assessmentRows.length, collections: canViewFinance ? collections : 0, staffOnDuty },
    attendance: { today: attendanceToday.length, present, rate: attendanceRate },
    attendanceTrend,
    collectionTrend: canViewFinance ? collectionTrend : [],
    learnerDistribution,
    genderDistribution,
    newEnrollmentsThisMonth,
    recentAttendance,
    lowStock: Array.from(stock.values()).filter(item => item.quantity <= item.reorderLevel),
    recentLearners: learnerRows.slice(0, 8).map(row => ({ ...row.learner, grade: row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "" })),
  };
}

export type LearnerStatus = "active" | "inactive";
export type PeopleStaffStatus = "active" | "inactive";
export type PeopleStaffRole = "super_admin" | "admin" | "teacher" | "class_teacher" | "senior_teacher" | "deputy_head" | "head_teacher" | "finance" | "storekeeper" | "other";
export function peoplePageWindow(page = 0, pageSize = 50) {
  const safePage = Math.max(0, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(10, Math.floor(pageSize)));
  return { page: safePage, pageSize: safePageSize, offset: safePage * safePageSize };
}

export async function listLearners(search?: string, userId?: number) {
  const db = await requireDb();
  const term = search?.trim();
  const schoolId = userId == null ? null : await actorSchoolId(userId);
  const rows = await db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(and(schoolId == null ? undefined : eq(learners.schoolId, schoolId), term ? or(like(learners.fullName, `%${term}%`), like(learners.admissionNumber, `%${term}%`), like(learners.guardianName, `%${term}%`), like(learners.status, `%${term}%`)) : undefined)).orderBy(learners.fullName);
  return rows.map(row => ({ ...row.learner, grade: row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "" }));
}

export async function listLearnersPage(input: { search?: string; page?: number; pageSize?: number }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const { page, pageSize, offset } = peoplePageWindow(input.page, input.pageSize);
  const term = input.search?.trim();
  const where = and(eq(learners.schoolId, schoolId), term ? or(like(learners.fullName, `%${term}%`), like(learners.admissionNumber, `%${term}%`), like(learners.guardianName, `%${term}%`), like(learners.status, `%${term}%`)) : undefined);
  const [rows, totalRows] = await Promise.all([
    db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(where).orderBy(learners.fullName).limit(pageSize).offset(offset),
    db.select({ total: count(learners.id) }).from(learners).where(where),
  ]);
  return { rows: rows.map(row => ({ ...row.learner, grade: row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "" })), total: Number(totalRows[0]?.total ?? 0), page, pageSize };
}

async function resolveGrade(gradeId: number, schoolId?: number) {
  const db = await requireDb();
  const grade = (await db.select().from(grades).where(and(eq(grades.id, gradeId), schoolId == null ? undefined : eq(grades.schoolId, schoolId))).limit(1))[0];
  if (!grade) throw new Error("GRADE_NOT_FOUND");
  return grade;
}

async function syncPrimaryGuardian(input: { learnerId: number; schoolId: number; fullName: string; idNumber?: string | null; phone?: string | null; userId: number }) {
  const db = await requireDb();
  const name = input.fullName.trim();
  if (!name) return;
  const existing = input.idNumber?.trim() ? (await db.select().from(guardians).where(and(eq(guardians.schoolId, input.schoolId), eq(guardians.idNumber, input.idNumber.trim()))).limit(1))[0] : undefined;
  const guardian = existing ? existing : (await db.insert(guardians).values({ schoolId: input.schoolId, fullName: name, idNumber: input.idNumber?.trim() || null, phone: input.phone?.trim() || null, communicationPreference: "sms" }).$returningId())[0];
  if (existing) await db.update(guardians).set({ fullName: name, idNumber: input.idNumber?.trim() || null, phone: input.phone?.trim() || null }).where(and(eq(guardians.id, existing.id), eq(guardians.schoolId, input.schoolId)));
  await db.insert(learnerGuardians).values({ schoolId: input.schoolId, learnerId: input.learnerId, guardianId: guardian.id, relationship: "Parent/Guardian", isPrimary: 1 }).onDuplicateKeyUpdate({ set: { relationship: "Parent/Guardian", isPrimary: 1 } });
  await writeAudit(input.userId, existing ? "guardian.update" : "guardian.create", "guardian", guardian.id, { learnerId: input.learnerId });
}

export async function createLearner(input: { fullName: string; admissionNumber: string; guardianName?: string | null; guardianIdNumber?: string | null; guardianPhone?: string | null; gradeId: number; status: LearnerStatus }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const fullName = input.fullName.trim(); const admissionNumber = input.admissionNumber.trim().toUpperCase();
  if (!fullName || !admissionNumber) throw new Error("LEARNER_REQUIRED_FIELDS");
  await resolveGrade(input.gradeId, schoolId);
  const duplicate = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.schoolId, schoolId), eq(learners.admissionNumber, admissionNumber))).limit(1))[0];
  if (duplicate) throw new Error("ADMISSION_NUMBER_EXISTS");
  const row = (await db.insert(learners).values({ schoolId, fullName, admissionNumber, guardianName: input.guardianName?.trim() || null, guardianIdNumber: input.guardianIdNumber?.trim() || null, guardianPhone: input.guardianPhone?.trim() || null, gradeId: input.gradeId, status: input.status }).$returningId())[0];
  if (input.guardianName?.trim()) await syncPrimaryGuardian({ learnerId: row.id, schoolId, fullName: input.guardianName, idNumber: input.guardianIdNumber, phone: input.guardianPhone, userId });
  await writeAudit(userId, "learner.create", "learner", row.id, { admissionNumber, gradeId: input.gradeId, status: input.status });
  return { ok: true, id: row.id };
}

export async function updateLearner(input: { learnerId: number; fullName: string; admissionNumber: string; guardianName?: string | null; guardianIdNumber?: string | null; guardianPhone?: string | null; gradeId: number; status: LearnerStatus }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const current = (await db.select().from(learners).where(and(eq(learners.id, input.learnerId), eq(learners.schoolId, schoolId))).limit(1))[0];
  if (!current) throw new Error("LEARNER_NOT_FOUND");
  await resolveGrade(input.gradeId, schoolId);
  const admissionNumber = input.admissionNumber.trim().toUpperCase();
  const duplicate = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.schoolId, schoolId), eq(learners.admissionNumber, admissionNumber), sql`${learners.id} <> ${input.learnerId}`)).limit(1))[0];
  if (duplicate) throw new Error("ADMISSION_NUMBER_EXISTS");
  await db.update(learners).set({ fullName: input.fullName.trim(), admissionNumber, guardianName: input.guardianName?.trim() || null, guardianIdNumber: input.guardianIdNumber?.trim() || null, guardianPhone: input.guardianPhone?.trim() || null, gradeId: input.gradeId, status: input.status }).where(and(eq(learners.id, input.learnerId), eq(learners.schoolId, schoolId)));
  if (input.guardianName?.trim()) await syncPrimaryGuardian({ learnerId: input.learnerId, schoolId, fullName: input.guardianName, idNumber: input.guardianIdNumber, phone: input.guardianPhone, userId });
  await writeAudit(userId, "learner.update", "learner", input.learnerId, { gradeId: input.gradeId, status: input.status });
  return { ok: true };
}

export async function setLearnerStatus(input: { learnerId: number; status: LearnerStatus }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const current = (await db.select({ id: learners.id }).from(learners).where(and(eq(learners.id, input.learnerId), eq(learners.schoolId, schoolId))).limit(1))[0];
  if (!current) throw new Error("LEARNER_NOT_FOUND");
  await db.update(learners).set({ status: input.status }).where(and(eq(learners.id, input.learnerId), eq(learners.schoolId, schoolId)));
  await writeAudit(userId, `learner.${input.status}`, "learner", input.learnerId, input);
  return { ok: true };
}

type AttendanceSession = "morning" | "afternoon";
type AttendanceSummaryPeriod = "weekly" | "monthly" | "termly" | "yearly";

function dateWindow(period: AttendanceSummaryPeriod, now = new Date()) {
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  if (period === "weekly") start.setDate(start.getDate() - 6);
  if (period === "monthly") start.setDate(1);
  if (period === "termly") { start.setMonth(start.getMonth() >= 8 ? 8 : start.getMonth() >= 4 ? 4 : 0, 1); }
  if (period === "yearly") start.setMonth(0, 1);
  return { start, end };
}

export async function listAttendance(date?: string, userId?: number, session: AttendanceSession = "morning") {
  const db = await requireDb();
  const rows = await db.select({ attendance: attendances, learner: learners, grade: grades }).from(attendances).innerJoin(learners, eq(learners.id, attendances.learnerId)).leftJoin(grades, eq(grades.id, attendances.gradeId)).where(and(date ? eq(attendances.attendanceDate, new Date(date)) : undefined, eq(attendances.session, session))).orderBy(desc(attendances.id));
  if (!userId) return rows.map(row => ({ ...row.attendance, learner: row.learner, grade: row.grade }));
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (actor?.role !== "user") return rows.map(row => ({ ...row.attendance, learner: row.learner, grade: row.grade }));
  const allowedGrades = new Set(await attendanceVisibleGradeIds(userId));
  return rows.filter(row => allowedGrades.has(row.learner.gradeId)).map(row => ({ ...row.attendance, learner: row.learner, grade: row.grade }));
}

export function isAttendanceAdmin(userRole?: string | null, staffRole?: string | null) {
  return userRole === "admin" || staffRole === "admin" || staffRole === "super_admin" || staffRole === "finance" || staffRole === "deputy_head" || staffRole === "head_teacher";
}

export function canAccessAttendanceGrade(userRole: string | null | undefined, staffRole: string | null | undefined, allocatedGradeIds: number[], gradeId: number) {
  return isAttendanceAdmin(userRole, staffRole) || allocatedGradeIds.includes(gradeId);
}
export function canCaptureAttendance(userRole: string | null | undefined, staffRole: string | null | undefined, classTeacherGradeIds: number[], gradeId: number) {
  return isAttendanceAdmin(userRole, staffRole) || (staffRole === "class_teacher" && classTeacherGradeIds.includes(gradeId));
}
async function classTeacherGradeIds(userId: number) {
  const db = await requireDb();
  const allocations = await db.select({ gradeId: teacherAllocations.gradeId }).from(teacherAllocations).where(and(
    eq(teacherAllocations.teacherUserId, userId),
    eq(teacherAllocations.status, "active"),
    eq(teacherAllocations.allocationType, "class_teacher"),
  ));
  return Array.from(new Set(allocations.map(row => row.gradeId)));
}
async function attendanceVisibleGradeIds(userId: number) {
  const db = await requireDb();
  const allocations = await db.select({ gradeId: teacherAllocations.gradeId }).from(teacherAllocations).where(and(
    eq(teacherAllocations.teacherUserId, userId),
    eq(teacherAllocations.status, "active"),
  ));
  return Array.from(new Set(allocations.map(row => row.gradeId)));
}
export async function getAttendanceRegister(date: string, userId: number, session: AttendanceSession = "morning") {
  const db = await requireDb();
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const staff = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  const isAdmin = isAttendanceAdmin(actor?.role, staff?.role);
  let allowedGradeIds: number[] | null = null;
  if (!isAdmin) {
    const profileGradeIds = await attendanceVisibleGradeIds(userId);
    allowedGradeIds = profileGradeIds;
    if (!allowedGradeIds.length) return [];
  }
  const roster = await db.select({ learner: learners, grade: grades }).from(learners)
    .leftJoin(grades, eq(grades.id, learners.gradeId))
    .where(and(eq(learners.status, "active"), allowedGradeIds ? inArray(learners.gradeId, allowedGradeIds) : undefined))
    .orderBy(grades.name, learners.fullName);
  if (!roster.length) return [];
  const saved = await db.select().from(attendances).where(and(
    eq(attendances.attendanceDate, new Date(date)),
    eq(attendances.session, session),
    inArray(attendances.learnerId, roster.map(row => row.learner.id)),
  ));
  const savedByLearner = new Map(saved.map(row => [row.learnerId, row]));
  return roster.map(row => ({
    ...row.learner,
    grade: row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "",
    attendanceStatus: savedByLearner.get(row.learner.id)?.status ?? null,
    attendanceNote: savedByLearner.get(row.learner.id)?.note ?? null,
    capturedAt: savedByLearner.get(row.learner.id)?.capturedAt ?? null,
  }));
}
export async function getAttendanceRegisterApproval(date: string, gradeId: number, userId?: number) {
  if (userId) await assertAttendanceGradeScope(gradeId, userId);
  const db = await requireDb();
  return (await db.select().from(attendanceRegisterApprovals).where(and(eq(attendanceRegisterApprovals.attendanceDate, new Date(date)), eq(attendanceRegisterApprovals.gradeId, gradeId))).limit(1))[0] ?? { status: "draft" as const, attendanceDate: date, gradeId, submittedAt: null, approvedAt: null, submittedByUserId: null, approvedByUserId: null, notes: null };
}
async function assertAttendanceGradeScope(gradeId: number, userId: number) {
  const db = await requireDb();
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const staff = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  const admin = isAttendanceAdmin(actor?.role, staff?.role);
  const classGrades = admin ? [gradeId] : await classTeacherGradeIds(userId);
  if (!canCaptureAttendance(actor?.role, staff?.role, classGrades, gradeId)) throw new Error("ATTENDANCE_SCOPE_FORBIDDEN");
  return { admin, db };
}
export async function setAttendanceRegisterStatus(input: { attendanceDate: string; gradeId: number; action: "submit" | "approve" | "reopen" }, userId: number) {
  const { admin, db } = await assertAttendanceGradeScope(input.gradeId, userId);
  if ((input.action === "approve" || input.action === "reopen") && !admin) throw new Error("ATTENDANCE_APPROVAL_FORBIDDEN");
  const current = await getAttendanceRegisterApproval(input.attendanceDate, input.gradeId);
  const now = new Date();
  const values = input.action === "submit"
    ? { status: "submitted" as const, submittedByUserId: userId, submittedAt: now }
    : input.action === "approve"
      ? { status: "approved" as const, approvedByUserId: userId, approvedAt: now }
      : { status: "reopened" as const, approvedByUserId: null, approvedAt: null };
  if ("id" in current) await db.update(attendanceRegisterApprovals).set(values).where(eq(attendanceRegisterApprovals.id, current.id));
  else await db.insert(attendanceRegisterApprovals).values({ attendanceDate: new Date(input.attendanceDate), gradeId: input.gradeId, ...values });
  await writeAudit(userId, `attendance.register.${input.action}`, "attendance_register", `${input.attendanceDate}:${input.gradeId}`, input);
  return getAttendanceRegisterApproval(input.attendanceDate, input.gradeId);
}
export async function getAttendanceSummary(input: { period: AttendanceSummaryPeriod; gradeLevel?: number }, userId: number) {
  const db = await requireDb();
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const staff = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  const allowed = isAttendanceAdmin(actor?.role, staff?.role) ? null : new Set(await attendanceVisibleGradeIds(userId));
  if (!allowed && !isAttendanceAdmin(actor?.role, staff?.role)) return { period: input.period, rows: [], totals: { present: 0, absent: 0, late: 0, excused: 0, sessions: 0 } };
  const window = dateWindow(input.period);
  const learnerRows = await db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(eq(learners.status, "active"));
  const rows = await db.select({ attendance: attendances }).from(attendances).where(and(gte(attendances.attendanceDate, window.start), lte(attendances.attendanceDate, window.end)));
  const grouped = new Map<number, { learnerId: number; learner: string; admissionNumber: string; grade: string; present: number; absent: number; late: number; excused: number; sessions: number }>();
  for (const row of learnerRows) {
    if (allowed && !allowed.has(row.learner.gradeId)) continue;
    const level = attendanceGradeLevel(row.grade?.name ?? "");
    if (input.gradeLevel && level !== input.gradeLevel) continue;
    grouped.set(row.learner.id, { learnerId: row.learner.id, learner: row.learner.fullName, admissionNumber: row.learner.admissionNumber, grade: row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "", present: 0, absent: 0, late: 0, excused: 0, sessions: 0 });
  }
  for (const row of rows) {
    const current = grouped.get(row.attendance.learnerId);
    if (current) { current[row.attendance.status] += 1; current.sessions += 1; }
  }
  const result = Array.from(grouped.values()).sort((a, b) => a.grade.localeCompare(b.grade) || a.learner.localeCompare(b.learner));
  return { period: input.period, from: window.start.toISOString().slice(0, 10), to: window.end.toISOString().slice(0, 10), rows: result, totals: result.reduce((sum, row) => ({ present: sum.present + row.present, absent: sum.absent + row.absent, late: sum.late + row.late, excused: sum.excused + row.excused, sessions: sum.sessions + row.sessions }), { present: 0, absent: 0, late: 0, excused: 0, sessions: 0 }) };
}
export async function saveAttendance(input: { learnerId: number; status: "present" | "absent" | "late" | "excused"; attendanceDate: string; session?: AttendanceSession; note?: string | null }, userId: number) {
  const db = await requireDb();
  const learner = (await db.select().from(learners).where(eq(learners.id, input.learnerId)).limit(1))[0];
  if (!learner) throw new Error("LEARNER_NOT_FOUND");
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const staff = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  const isAdmin = isAttendanceAdmin(actor?.role, staff?.role);
  if (!isAdmin) {
    const allowedGradeIds = await classTeacherGradeIds(userId);
    if (!canCaptureAttendance(actor?.role, staff?.role, allowedGradeIds, learner.gradeId)) throw new Error("ATTENDANCE_SCOPE_FORBIDDEN");
  }
  const session = input.session ?? "morning";
  await db.insert(attendances).values({ learnerId: input.learnerId, status: input.status, attendanceDate: new Date(input.attendanceDate), session, capturedAt: new Date(), note: input.note ?? null, gradeId: learner.gradeId }).onDuplicateKeyUpdate({ set: { status: input.status, capturedAt: new Date(), note: input.note ?? null } });
  await writeAudit(userId, "attendance.save", "learner", learner.id, input);
  return { ok: true };
}

export async function evaluateGuardianAbsenceAlerts(learnerIds: number[], userId: number) {
  const db = await requireDb();
  const uniqueIds = Array.from(new Set(learnerIds));
  if (!uniqueIds.length) return { created: 0 };
  const learnerRows = await db.select().from(learners).where(inArray(learners.id, uniqueIds));
  let created = 0;
  for (const learner of learnerRows) {
    const rows = await db.select().from(attendances).where(eq(attendances.learnerId, learner.id));
    const unexcused = rows.filter(row => row.status === "absent" || row.status === "late").length;
    if (unexcused < 3) continue;
    const title = `Guardian follow-up: ${learner.fullName}`;
    const body = `${learner.fullName} (${learner.admissionNumber}) has ${unexcused} recorded absent/late sessions. Contact ${learner.guardianName ?? "the guardian"}${learner.guardianPhone ? ` on ${learner.guardianPhone}` : ""} and record the follow-up.`;
    const existing = (await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.title, title), eq(notifications.body, body), eq(notifications.status, "published"))).limit(1))[0];
    if (!existing) {
      const row = (await db.insert(notifications).values({ audience: "parents", title, body, status: "published", createdByUserId: userId }).$returningId())[0];
      await writeAudit(userId, "attendance.guardian_alert", "notification", row.id, { learnerId: learner.id, unexcused });
      created += 1;
    }
  }
  return { created };
}

export async function saveAttendanceBatch(input: { attendanceDate: string; session?: AttendanceSession; entries: AttendanceBatchEntry[] }, userId: number) {
  const entries = validateAttendanceBatch(input.entries);
  const db = await requireDb();
  const learnerIds = entries.map(entry => entry.learnerId);
  const learnerRows = await db.select({ id: learners.id, gradeId: learners.gradeId, status: learners.status }).from(learners).where(inArray(learners.id, learnerIds));
  if (learnerRows.length !== learnerIds.length || learnerRows.some(row => row.status !== "active")) throw new Error("ACTIVE_LEARNER_NOT_FOUND");

  const gradeIds = Array.from(new Set(learnerRows.map(row => row.gradeId)));
  const gradeRows = await db.select({ id: grades.id, name: grades.name }).from(grades).where(inArray(grades.id, gradeIds));
  const gradeLevelById = new Map(gradeRows.map(row => [row.id, attendanceGradeLevel(row.name)]));
  if (gradeIds.some(gradeId => !gradeLevelById.get(gradeId))) throw new Error("ATTENDANCE_GRADE_NOT_SUPPORTED");
  if (new Set(gradeIds.map(gradeId => gradeLevelById.get(gradeId))).size !== 1) throw new Error("ATTENDANCE_BATCH_MUST_USE_ONE_GRADE");

  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const staff = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  const isAdmin = isAttendanceAdmin(actor?.role, staff?.role);
  let allocatedGradeIds: number[] = [];
  if (!isAdmin) {
    allocatedGradeIds = await classTeacherGradeIds(userId);
  }
  if (learnerRows.some(row => !canCaptureAttendance(actor?.role, staff?.role, allocatedGradeIds, row.gradeId))) throw new Error("ATTENDANCE_SCOPE_FORBIDDEN");

  const counts = entries.reduce<Record<string, number>>((result, entry) => {
    result[entry.status] = (result[entry.status] ?? 0) + 1;
    return result;
  }, {});
  const values = entries.map(entry => {
    const learner = learnerRows.find(row => row.id === entry.learnerId)!;
    return { learnerId: learner.id, gradeId: learner.gradeId, attendanceDate: new Date(input.attendanceDate), session: input.session ?? "morning", capturedAt: new Date(), status: entry.status, note: null };
  });
  await db.transaction(async tx => {
    await tx.insert(attendances).values(values).onDuplicateKeyUpdate({ set: {
      status: sql.raw("VALUES(status)"),
      capturedAt: sql.raw("VALUES(capturedAt)"),
      note: sql.raw("VALUES(note)"),
    } });
    await tx.insert(auditLogs).values({
      userId,
      action: "attendance.batch_save",
      entityType: "attendance_register",
      entityId: input.attendanceDate,
      metadata: JSON.stringify({ savedCount: entries.length, session: input.session ?? "morning", gradeIds, gradeLevels: Array.from(new Set(gradeIds.map(id => gradeLevelById.get(id)))), counts }),
    });
  });
  const alerts = await evaluateGuardianAbsenceAlerts(entries.map(entry => entry.learnerId), userId);
  return { ok: true, savedCount: entries.length, counts, guardianAlertsCreated: alerts.created };
}

export async function listAssessments() {
  const db = await requireDb();
  return db.select({ assessment: assessments, grade: grades }).from(assessments).leftJoin(grades, eq(grades.id, assessments.gradeId)).orderBy(desc(assessments.id));
}

export async function listMarks(assessmentId?: number, userId?: number) {
  const db = await requireDb();
  const rows = await db.select({ mark: marks, learner: learners, subject: subjects }).from(marks).innerJoin(learners, eq(learners.id, marks.learnerId)).innerJoin(subjects, eq(subjects.id, marks.subjectId)).where(assessmentId ? eq(marks.assessmentId, assessmentId) : undefined).orderBy(learners.fullName);
  if (!userId) return rows.map(row => ({ ...row.mark, learner: row.learner, subject: row.subject }));
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (actor?.role !== "user") return rows.map(row => ({ ...row.mark, learner: row.learner, subject: row.subject }));
  const allocations = await db.select().from(teacherAllocations).where(and(eq(teacherAllocations.teacherUserId, userId), eq(teacherAllocations.status, "active")));
  const allowed = new Set(allocations.map(row => `${row.gradeId}:${row.subjectId}`));
  return rows.filter(row => allowed.has(`${row.learner.gradeId}:${row.mark.subjectId}`)).map(row => ({ ...row.mark, learner: row.learner, subject: row.subject }));
}

export async function saveMark(input: { assessmentId: number; learnerId: number; subjectId: number; midTerm: number; endTerm: number; teacherRemark?: string | null }, userId: number) {
  const db = await requireDb();
  const assessment = (await db.select().from(assessments).where(eq(assessments.id, input.assessmentId)).limit(1))[0];
  const learner = (await db.select().from(learners).where(eq(learners.id, input.learnerId)).limit(1))[0];
  if (!assessment || !learner || assessment.gradeId !== learner.gradeId) throw new Error("MARK_CONTEXT_INVALID");
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (actor?.role === "user") {
    const allocation = (await db.select().from(teacherAllocations).where(and(eq(teacherAllocations.teacherUserId, userId), eq(teacherAllocations.gradeId, learner.gradeId), eq(teacherAllocations.subjectId, input.subjectId), eq(teacherAllocations.status, "active"))).limit(1))[0];
    if (!allocation) throw new Error("MARK_SCOPE_FORBIDDEN");
  }
  const midTerm = assertScore(input.midTerm);
  const endTerm = assertScore(input.endTerm);
  if (assessment.status !== "draft") throw new Error("ASSESSMENT_NOT_DRAFT_USE_WORKFLOW");
  const score = assessment.assessmentType === "mid_term" ? midTerm : endTerm;
  const average = score;
  const values = { ...input, teacherUserId: assessment.teacherUserId, score: String(score), midTerm: assessment.assessmentType === "mid_term" ? String(score) : null, endTerm: assessment.assessmentType === "end_term" ? String(score) : null, average: String(average), cbcLevel: cbcLevel(average) as "EE1" | "EE2" | "ME1" | "ME2" | "AE1" | "AE2" | "BE1" | "BE2", updatedByUserId: userId };
  await db.insert(marks).values(values).onDuplicateKeyUpdate({ set: values });
  await writeAudit(userId, "assessment.save", "mark", `${input.assessmentId}:${input.learnerId}:${input.subjectId}`, { average, cbcLevel: values.cbcLevel });
  return { ...values, average, cbcLevel: values.cbcLevel };
}

export async function getFinanceOverview(learnerId?: number) {
  const db = await requireDb();
  const learnersRows = await db.select().from(learners).where(learnerId ? eq(learners.id, learnerId) : eq(learners.status, "active"));
  const feeRows = await db.select().from(feeStructures);
  const paymentRows = await db.select().from(payments).orderBy(desc(payments.paidAt));
  const byLearner = learnersRows.map(learner => {
    const required = feeRows.filter(fee => fee.gradeId === learner.gradeId).reduce((sum, fee) => sum + Number(fee.amount), 0);
    const paid = paymentRows.filter(payment => payment.learnerId === learner.id).reduce((sum, payment) => sum + Number(payment.amount), 0);
    return { learner, required, paid, balance: required - paid };
  });
  return { balances: byLearner, payments: paymentRows.slice(0, 50), totals: { required: byLearner.reduce((s, row) => s + row.required, 0), paid: byLearner.reduce((s, row) => s + row.paid, 0) } };
}

export async function recordPayment(input: { learnerId: number; amount: number; paymentMethod: "mpesa" | "bank" | "cash"; reference: string }, userId: number) {
  const db = await requireDb();
  if (input.amount <= 0) throw new Error("INVALID_AMOUNT");
  await db.insert(payments).values({ ...input, amount: String(input.amount) });
  await writeAudit(userId, "finance.payment", "payment", input.reference, input);
  return { ok: true, reference: input.reference };
}

export async function getStoreOverview() {
  const db = await requireDb();
  const rows = await db.select({ item: storeItems, movement: storeMovements }).from(storeItems).leftJoin(storeMovements, eq(storeItems.id, storeMovements.itemId));
  const items = new Map<number, { id: number; name: string; unit: string; reorderLevel: number; quantity: number }>();
  for (const row of rows) {
    if (!row.item) continue;
    const item = items.get(row.item.id) ?? { id: row.item.id, name: row.item.name, unit: row.item.unit, reorderLevel: Number(row.item.reorderLevel), quantity: 0 };
    if (row.movement) item.quantity += row.movement.movementType === "issued" ? -Number(row.movement.quantity) : Number(row.movement.quantity);
    items.set(row.item.id, item);
  }
  return Array.from(items.values());
}

export async function recordStoreMovement(input: { itemId: number; movementType: "received" | "issued" | "adjustment"; quantity: number; reference?: string | null }, userId: number) {
  const db = await requireDb();
  if (input.quantity <= 0) throw new Error("INVALID_QUANTITY");
  await db.insert(storeMovements).values({ ...input, quantity: String(input.quantity) });
  await writeAudit(userId, "store.movement", "store_item", input.itemId, input);
  return { ok: true };
}

export async function listTimetable() {
  const db = await requireDb();
  const settings = await getSettings();
  const rows = await db.select({ entry: timetableEntries, grade: grades, subject: subjects, teacher: users, staff: staffProfiles }).from(timetableEntries).leftJoin(grades, eq(grades.id, timetableEntries.gradeId)).leftJoin(subjects, eq(subjects.id, timetableEntries.subjectId)).leftJoin(users, eq(users.id, timetableEntries.teacherUserId)).leftJoin(staffProfiles, eq(staffProfiles.userId, timetableEntries.teacherUserId)).orderBy(timetableEntries.dayOfWeek, timetableEntries.period);
  const allocations = await db.select({ gradeId: teacherAllocations.gradeId, subjectId: teacherAllocations.subjectId, teacherUserId: teacherAllocations.teacherUserId, schoolId: teacherAllocations.schoolId, status: teacherAllocations.status, allocationType: teacherAllocations.allocationType }).from(teacherAllocations).where(and(eq(teacherAllocations.academicYear, Number(settings.academicYear)), eq(teacherAllocations.status, "active")));
  const alignedIds = new Set(timetableEntriesAlignedWithAllocations(rows.map(row => ({ ...row.entry, schoolId: row.entry.schoolId ?? row.grade?.schoolId ?? null })), allocations).map(entry => entry.id));
  return rows.filter(row => alignedIds.has(row.entry.id));
}

export type TimetableAuditRequirement = { gradeId: number; gradeName: string; gradeStream?: string | null; subjectId: number; subjectName: string; subjectCode?: string | null; periodsPerWeek: number };
export type TimetableAuditAllocation = { schoolId?: number | null; gradeId: number; subjectId: number; teacherUserId: number; displayName?: string | null; teacherCode?: number | null; status: string; allocationType: string };
export type TimetableAuditEntry = { id: number; schoolId?: number | null; gradeId: number; subjectId: number; teacherUserId: number };

export function buildTimetableAuditRows(requirements: TimetableAuditRequirement[], allocations: TimetableAuditAllocation[], entries: TimetableAuditEntry[]) {
  const activeAllocations = allocations.filter(allocation => allocation.status === "active" && allocation.allocationType !== "class_teacher");
  const alignedEntries = timetableEntriesAlignedWithAllocations(entries, activeAllocations);
  return requirements.map(requirement => {
    const subjectAllocations = Array.from(new Map(activeAllocations.filter(allocation => allocation.gradeId === requirement.gradeId && allocation.subjectId === requirement.subjectId).map(allocation => [allocation.teacherUserId, allocation])).values());
    const teacherIds = new Set(subjectAllocations.map(allocation => allocation.teacherUserId));
    const scheduled = alignedEntries.filter(entry => entry.gradeId === requirement.gradeId && entry.subjectId === requirement.subjectId && teacherIds.has(entry.teacherUserId)).length;
    const missing = Math.max(0, requirement.periodsPerWeek - scheduled);
    return {
      gradeId: requirement.gradeId,
      gradeName: requirement.gradeName,
      gradeStream: requirement.gradeStream ?? null,
      subjectId: requirement.subjectId,
      subjectName: requirement.subjectName,
      subjectCode: requirement.subjectCode ?? null,
      expectedLessons: requirement.periodsPerWeek,
      scheduledLessons: scheduled,
      unplacedLessons: missing,
      missingTeacherAllocation: subjectAllocations.length === 0,
      status: subjectAllocations.length === 0 ? "missing_teacher" : missing > 0 ? "under_scheduled" : scheduled > requirement.periodsPerWeek ? "over_scheduled" : "complete",
      allocatedTeachers: subjectAllocations.map(allocation => ({ userId: allocation.teacherUserId, displayName: allocation.displayName ?? `User ${allocation.teacherUserId}`, teacherCode: allocation.teacherCode ?? null })),
    };
  });
}


export type TimetableValidationAllocation = TimetableAuditAllocation & { activeEmployment?: boolean; role?: string | null };
export type TimetableValidationEntry = TimetableAuditEntry & { dayOfWeek: number; period: number; room?: string | null };

/**
 * Produces a read-only validation report. Hard conflicts block approval; soft
 * warnings are recommendations and do not silently alter allocations.
 */
export function buildTimetableValidationReport(
  requirements: TimetableAuditRequirement[],
  allocations: TimetableValidationAllocation[],
  entries: TimetableValidationEntry[],
) {
  const activeAllocations = allocations.filter(row => row.status === "active" && row.allocationType !== "class_teacher");
  const auditRows = buildTimetableAuditRows(requirements, activeAllocations, entries);
  const hardConflicts = Array.from(new Set(timetableConflicts(entries)));
  const activeTeacherIds = new Set(activeAllocations.map(row => row.teacherUserId));
  const invalidEntries = entries.filter(entry => !activeAllocations.some(allocation => allocation.gradeId === entry.gradeId && allocation.subjectId === entry.subjectId && allocation.teacherUserId === entry.teacherUserId));
  const inactiveTeacherEntries = entries.filter(entry => allocations.some(allocation => allocation.teacherUserId === entry.teacherUserId && allocation.activeEmployment === false));
  const softWarnings: Array<{ kind: "consecutive_teacher" | "subject_clustering"; gradeId: number; day: number; periods: number[]; teacherUserId?: number; message: string }> = [];
  const gradeNames = new Map(requirements.map(row => [row.gradeId, `${row.gradeName}${row.gradeStream ? ` ${row.gradeStream}` : ""}`]));
  const subjectNames = new Map(requirements.map(row => [row.subjectId, row.subjectName]));
  const byGradeDayPeriod = new Map<string, TimetableValidationEntry[]>();
  for (const entry of entries) {
    const key = `${entry.gradeId}:${entry.dayOfWeek}:${entry.period}`;
    byGradeDayPeriod.set(key, [...(byGradeDayPeriod.get(key) ?? []), entry]);
  }
  // The configured school day has breaks after lesson periods 2 and 4 and lunch after 6.
  const adjacentPairs: Array<[number, number]> = [[1, 2], [3, 4], [5, 6], [7, 8]];
  for (const entry of entries) {
    for (const [firstPeriod, secondPeriod] of adjacentPairs) {
      if (entry.period !== secondPeriod) continue;
      const previousRows = byGradeDayPeriod.get(`${entry.gradeId}:${entry.dayOfWeek}:${firstPeriod}`) ?? [];
      if (!previousRows.some(previous => previous.teacherUserId === entry.teacherUserId)) continue;
      const key = `${entry.gradeId}:${entry.dayOfWeek}:${firstPeriod}:${secondPeriod}:${entry.teacherUserId}`;
      if (softWarnings.some(warning => `${warning.gradeId}:${warning.day}:${warning.periods[0]}:${warning.periods[1]}:${warning.teacherUserId}` === key)) continue;
      softWarnings.push({ kind: "consecutive_teacher", gradeId: entry.gradeId, day: entry.dayOfWeek, periods: [firstPeriod, secondPeriod], teacherUserId: entry.teacherUserId, message: `Review ${gradeNames.get(entry.gradeId) ?? `Grade ${entry.gradeId}`} periods ${firstPeriod}-${secondPeriod}; the same teacher is scheduled consecutively. This remains a soft recommendation and may be an approved double period.` });
    }
  }
  const morningSubjects = ["English", "Kiswahili", "Mathematics", "Physical Education", "Physical and Health Education"];
  const normalizeSubject = (value: string) => value.replace(/^CBC[-\s]*/i, "").replace(/[^a-z]/gi, "").toLowerCase();
  const morningPlacement = morningSubjects.map(subject => {
    const subjectRequirements = requirements.filter(row => isPreNoonTimetableSubject(row.subjectName) && normalizeSubject(row.subjectName) === normalizeSubject(subject));
    const subjectIds = new Set(subjectRequirements.map(row => row.subjectId));
    const subjectEntries = entries.filter(entry => subjectIds.has(entry.subjectId));
    const morning = subjectEntries.filter(entry => entry.period <= 6).length;
    const afternoon = subjectEntries.filter(entry => entry.period > 6).length;
    const expected = subjectRequirements.reduce((sum, row) => sum + row.periodsPerWeek, 0);
    return { subject, expected, morning, afternoon, exceptions: afternoon ? `Could not place ${afternoon} lesson${afternoon === 1 ? "" : "s"} before lunch under the current teacher/class constraints.` : null };
  }).filter(row => row.expected > 0);
  const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const teacherById = new Map(activeAllocations.map(allocation => [allocation.teacherUserId, allocation]));
  const teacherWorkloadMap = new Map<number, { teacherUserId: number; teacherName: string; teacherCode: number | null; weeklyLessons: number; dailyLessons: Record<string, number> }>();
  for (const entry of entries) {
    const allocation = teacherById.get(entry.teacherUserId) ?? allocations.find(row => row.teacherUserId === entry.teacherUserId);
    const current = teacherWorkloadMap.get(entry.teacherUserId) ?? { teacherUserId: entry.teacherUserId, teacherName: allocation?.displayName ?? `Teacher ${entry.teacherUserId}`, teacherCode: allocation?.teacherCode ?? null, weeklyLessons: 0, dailyLessons: {} };
    const day = dayNames[entry.dayOfWeek] ?? `Day ${entry.dayOfWeek}`;
    current.weeklyLessons += 1;
    current.dailyLessons[day] = (current.dailyLessons[day] ?? 0) + 1;
    teacherWorkloadMap.set(entry.teacherUserId, current);
  }
  const teacherWorkload = Array.from(teacherWorkloadMap.values()).sort((a, b) => b.weeklyLessons - a.weeklyLessons || a.teacherName.localeCompare(b.teacherName));
  const hardConflictDetails = hardConflicts.map(conflict => {
    const parts = conflict.split(":");
    if (parts[0] === "teacher") {
      const teacherId = Number(parts[3]);
      const teacher = teacherById.get(teacherId) ?? allocations.find(row => row.teacherUserId === teacherId);
      const teacherLabel = `${teacher?.displayName ?? `Teacher ${teacherId}`}${teacher?.teacherCode ? ` · Code ${teacher.teacherCode}` : ""}`;
      return { conflict, type: "teacher_clash", label: `Teacher clash: ${teacherLabel} is scheduled in more than one class on ${dayNames[Number(parts[1])] ?? `Day ${parts[1]}`}, period ${parts[2]}.`, day: Number(parts[1]), period: Number(parts[2]), teacherUserId: teacherId, suggestion: "Move one affected class to an unoccupied lesson period for this teacher." };
    }
    if (parts[0] === "grade") {
      const gradeId = Number(parts[3]);
      return { conflict, type: "grade_clash", label: `Class clash: ${gradeNames.get(gradeId) ?? `Class ${gradeId}`} has more than one lesson in ${dayNames[Number(parts[1])] ?? `Day ${parts[1]}`}, period ${parts[2]}.`, day: Number(parts[1]), period: Number(parts[2]), gradeId, suggestion: "Keep one lesson in this class slot and move the other to an empty period." };
    }
    return { conflict, type: "room_clash", label: `Room clash: room ${parts.slice(3).join(":") || "the assigned room"} is double-booked on ${dayNames[Number(parts[1])] ?? `Day ${parts[1]}`}, period ${parts[2]}.`, suggestion: "Assign a different room or move one lesson to an available period." };
  });
  const missingAllocations = auditRows.filter(row => row.missingTeacherAllocation).map(row => ({ gradeId: row.gradeId, subjectId: row.subjectId, grade: `${row.gradeName}${row.gradeStream ? ` ${row.gradeStream}` : ""}`, subject: row.subjectName }));
  const totalExpected = auditRows.reduce((sum, row) => sum + row.expectedLessons, 0);
  const totalScheduled = auditRows.reduce((sum, row) => sum + row.scheduledLessons, 0);
  return {
    hardConflicts: hardConflictDetails,
    softWarnings,
    missingAllocations,
    invalidEntries: invalidEntries.map(entry => ({ id: entry.id, gradeId: entry.gradeId, subjectId: entry.subjectId, teacherUserId: entry.teacherUserId })),
    inactiveTeacherEntries: inactiveTeacherEntries.map(entry => ({ id: entry.id, teacherUserId: entry.teacherUserId, gradeId: entry.gradeId, subjectId: entry.subjectId })),
    subjectTotals: auditRows,
    teacherWorkload,
    morningPlacement,
    totalExpected,
    totalScheduled,
    totalUnplaced: Math.max(0, totalExpected - totalScheduled),
    valid: hardConflictDetails.length === 0 && missingAllocations.length === 0 && invalidEntries.length === 0 && inactiveTeacherEntries.length === 0 && totalExpected === totalScheduled,
    notes: activeTeacherIds.size === 0 ? ["No active teacher allocations are configured for the current academic year."] : [],
  };
}

export async function getTimetableValidationReport(academicYear?: number) {
  const db = await requireDb();
  const settings = await getSettings();
  const year = academicYear ?? Number(settings.academicYear);
  const [requirementRows, allocationRows, entries] = await Promise.all([
    db.select({ requirement: timetableRequirements, grade: grades, subject: subjects }).from(timetableRequirements).innerJoin(grades, eq(grades.id, timetableRequirements.gradeId)).innerJoin(subjects, eq(subjects.id, timetableRequirements.subjectId)).where(and(eq(timetableRequirements.academicYear, year), sql`${timetableRequirements.periodsPerWeek} > 0`)),
    db.select({ allocation: teacherAllocations, staff: staffProfiles, user: users }).from(teacherAllocations).leftJoin(staffProfiles, eq(staffProfiles.userId, teacherAllocations.teacherUserId)).leftJoin(users, eq(users.id, teacherAllocations.teacherUserId)).where(eq(teacherAllocations.academicYear, year)),
    db.select().from(timetableEntries),
  ]);
  return buildTimetableValidationReport(
    requirementRows.map(row => ({ gradeId: row.requirement.gradeId, gradeName: row.grade.name, gradeStream: row.grade.stream, subjectId: row.requirement.subjectId, subjectName: row.subject.name, subjectCode: row.subject.code, periodsPerWeek: row.requirement.periodsPerWeek })),
    allocationRows.map(row => ({ ...row.allocation, displayName: row.staff?.displayName ?? row.user?.name ?? null, teacherCode: row.staff?.teacherCode ?? null, activeEmployment: row.staff?.status === "active" })),
    entries,
  );
}

export async function listTimetableAudit(academicYear?: number) {
  const db = await requireDb();
  const settings = await getSettings();
  const year = academicYear ?? Number(settings.academicYear);
  const requirementRows = await db.select({ requirement: timetableRequirements, grade: grades, subject: subjects }).from(timetableRequirements).innerJoin(grades, eq(grades.id, timetableRequirements.gradeId)).innerJoin(subjects, eq(subjects.id, timetableRequirements.subjectId)).where(and(eq(timetableRequirements.academicYear, year), sql`${timetableRequirements.periodsPerWeek} > 0`)).orderBy(grades.name, subjects.name);
  const allocationRows = await db.select({ allocation: teacherAllocations, staff: staffProfiles }).from(teacherAllocations).leftJoin(staffProfiles, eq(staffProfiles.userId, teacherAllocations.teacherUserId)).where(and(eq(teacherAllocations.academicYear, year), eq(teacherAllocations.status, "active")));
  const entries = await db.select().from(timetableEntries);
  return buildTimetableAuditRows(
    requirementRows.map(row => ({ gradeId: row.requirement.gradeId, gradeName: row.grade.name, gradeStream: row.grade.stream, subjectId: row.requirement.subjectId, subjectName: row.subject.name, subjectCode: row.subject.code, periodsPerWeek: row.requirement.periodsPerWeek })),
    allocationRows.map(row => ({ ...row.allocation, displayName: row.staff?.displayName ?? null, teacherCode: row.staff?.teacherCode ?? null })),
    entries,
  );
}

export function isMasterTimetableAdmin(userRole?: string | null, staffRole?: string | null) {
  return userRole === "admin" || staffRole === "super_admin" || staffRole === "admin" || staffRole === "deputy_head" || staffRole === "head_teacher";
}
export async function canViewMasterTimetable(userId: number, userRole?: string | null) {
  const db = await requireDb();
  const profile = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  return isMasterTimetableAdmin(userRole, profile?.role) || profile?.role === "class_teacher";
}
export async function canManageMasterTimetable(userId: number, userRole?: string | null) {
  const db = await requireDb();
  const profile = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  return isMasterTimetableAdmin(userRole, profile?.role);
}

export async function getPersonalTimetable(userId: number) {
  const db = await requireDb();
  const profile = (await db.select({ displayName: staffProfiles.displayName, teacherCode: staffProfiles.teacherCode }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  const user = (await db.select({ name: users.name, username: users.username }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const settings = (await db.select({ enabledSchoolLevels: schoolSettings.enabledSchoolLevels, academicYear: schoolSettings.academicYear }).from(schoolSettings).limit(1))[0];
  const enabledLevels = new Set((settings?.enabledSchoolLevels || "ECDE,Lower Primary,Upper Primary,Junior School,Senior School").split(",").flatMap(level => level === "Primary" ? ["Lower Primary", "Upper Primary"] : level));
  const relevantAreas = new Set(curriculumCatalogue().filter(row => enabledLevels.has(row.level)).map(row => row.area.toLowerCase()));
  const entries = await db.select({ entry: timetableEntries, grade: grades, subject: subjects })
    .from(timetableEntries)
    .leftJoin(grades, eq(grades.id, timetableEntries.gradeId))
    .leftJoin(subjects, eq(subjects.id, timetableEntries.subjectId))
    .where(eq(timetableEntries.teacherUserId, userId))
    .orderBy(timetableEntries.dayOfWeek, timetableEntries.period);
  const allocations = await db.select({ gradeId: teacherAllocations.gradeId, subjectId: teacherAllocations.subjectId, teacherUserId: teacherAllocations.teacherUserId, schoolId: teacherAllocations.schoolId, status: teacherAllocations.status, allocationType: teacherAllocations.allocationType }).from(teacherAllocations).where(and(eq(teacherAllocations.teacherUserId, userId), eq(teacherAllocations.academicYear, Number(settings?.academicYear ?? new Date().getFullYear())), eq(teacherAllocations.status, "active")));
  const alignedIds = new Set(timetableEntriesAlignedWithAllocations(entries.map(row => ({ ...row.entry, schoolId: row.entry.schoolId ?? row.grade?.schoolId ?? null })), allocations).map(entry => entry.id));
  const visibleEntries = entries.filter(row => {
    const grade = row.grade?.name?.toLowerCase() ?? "";
    const levelVisible = (enabledLevels.has("ECDE") && /^(pp|pre-primary)/i.test(grade)) || ((enabledLevels.has("Lower Primary") && /^grade [1-3]$/i.test(grade)) || (enabledLevels.has("Upper Primary") && /^grade [4-6]$/i.test(grade))) || (enabledLevels.has("Junior School") && /^grade [7-9]$/i.test(grade)) || (enabledLevels.has("Senior School") && /^grade (10|11|12)$/i.test(grade));
    return alignedIds.has(row.entry.id) && levelVisible && (!row.subject || relevantAreas.has(row.subject.name.toLowerCase()));
  });
  return { teacherName: profile?.displayName ?? user?.name ?? user?.username ?? "Teacher", teacherCode: profile?.teacherCode ?? null, entries: visibleEntries };
}

export async function listTeacherCodes() {
  const db = await requireDb();
  return db.select({ profile: staffProfiles, user: users }).from(staffProfiles).leftJoin(users, eq(users.id, staffProfiles.userId)).orderBy(staffProfiles.createdAt, staffProfiles.id);
}

export async function updateTeacherCode(input: { staffProfileId: number; teacherCode: number }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const current = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.schoolId, schoolId))).limit(1))[0];
  if (!current) throw new Error("TEACHER_NOT_FOUND");
  const other = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.teacherCode, input.teacherCode), eq(staffProfiles.schoolId, schoolId))).limit(1))[0];
  if (other && other.id !== input.staffProfileId) {
    await db.update(staffProfiles).set({ teacherCode: null }).where(eq(staffProfiles.id, other.id));
    await writeAudit(userId, "timetable.teacher_code.cleared", "staff_profile", other.id, { replacedByStaffProfileId: input.staffProfileId, previousCode: input.teacherCode });
  }
  await db.update(staffProfiles).set({ teacherCode: input.teacherCode }).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.schoolId, schoolId)));
  await writeAudit(userId, "timetable.teacher_code.update", "staff_profile", input.staffProfileId, { ...input, replacedStaffProfileId: other?.id ?? null });
  return { ok: true, replacedStaffProfileId: other?.id ?? null };
}

export function timetableConflicts(entries: Array<{ dayOfWeek: number; period: number; gradeId: number; teacherUserId: number; room?: string | null }>) {
  const seen = new Set<string>();
  const conflicts: string[] = [];
  for (const entry of entries) {
    for (const key of [`grade:${entry.dayOfWeek}:${entry.period}:${entry.gradeId}`, `teacher:${entry.dayOfWeek}:${entry.period}:${entry.teacherUserId}`, entry.room ? `room:${entry.dayOfWeek}:${entry.period}:${entry.room}` : ""]) {
      if (key && seen.has(key)) conflicts.push(key);
      if (key) seen.add(key);
    }
  }
  return conflicts;
}

export function unallocatedTimetableEntries(entries: Array<{ gradeId: number; subjectId: number; teacherUserId: number }>, allocations: Array<{ gradeId: number; subjectId: number; teacherUserId: number; status: string; allocationType: string }>) {
  const allowed = new Set(allocations.filter(row => row.status === "active" && row.allocationType !== "class_teacher").map(row => `${row.gradeId}:${row.subjectId}:${row.teacherUserId}`));
  return entries.filter(entry => !allowed.has(`${entry.gradeId}:${entry.subjectId}:${entry.teacherUserId}`));
}

export function timetableEntriesAlignedWithAllocations<T extends { id: number; schoolId?: number | null; gradeId: number; subjectId: number; teacherUserId: number }>(entries: T[], allocations: Array<{ schoolId?: number | null; gradeId: number; subjectId: number; teacherUserId: number; status: string; allocationType: string }>) {
  return entries.filter(entry => allocations.some(allocation => allocation.status === "active" && allocation.allocationType !== "class_teacher" && allocation.gradeId === entry.gradeId && allocation.subjectId === entry.subjectId && allocation.teacherUserId === entry.teacherUserId && (entry.schoolId == null || allocation.schoolId == null || allocation.schoolId === entry.schoolId)));
}

export function isPreNoonTimetableSubject(subjectName: string) {
  const normalized = subjectName.replace(/^CBC[-\s]*/i, "").replace(/[^a-z]/gi, "").toLowerCase();
  return normalized === "english" || normalized === "kiswahili" || normalized === "mathematics" || normalized === "physicaleducation" || normalized === "physicalandhealtheducation";
}

export function hasAdjacentTeacherLesson(teacherAtClassSlot: Map<string, number>, gradeId: number, teacherId: number, day: number, period: number) {
  return teacherAtClassSlot.get(`${gradeId}:${day}:${period - 1}`) === teacherId || teacherAtClassSlot.get(`${gradeId}:${day}:${period + 1}`) === teacherId;
}

export async function generateTimetable(entries: Array<{ dayOfWeek: number; period: number; gradeId: number; subjectId: number; teacherUserId: number; room?: string | null }>, userId: number) {
  const conflicts = timetableConflicts(entries);
  if (conflicts.length) throw new Error(`TIMETABLE_CLASH:${conflicts.join(",")}`);
  const db = await requireDb();
  const settings = await getSettings();
  const activeAllocations = await db.select({ gradeId: teacherAllocations.gradeId, subjectId: teacherAllocations.subjectId, teacherUserId: teacherAllocations.teacherUserId, status: teacherAllocations.status, allocationType: teacherAllocations.allocationType }).from(teacherAllocations).where(and(eq(teacherAllocations.academicYear, Number(settings.academicYear)), eq(teacherAllocations.status, "active")));
  const unallocated = unallocatedTimetableEntries(entries, activeAllocations);
  if (unallocated.length) throw new Error(`UNALLOCATED_SUBJECT:${unallocated[0].gradeId}:${unallocated[0].subjectId}:${unallocated[0].teacherUserId}`);
  if (entries.length) await db.insert(timetableEntries).values(entries);
  await writeAudit(userId, "timetable.generate", "timetable", null, { count: entries.length });
  return { placed: entries.length, conflicts: [] };
}

export async function listTimetableRequirements(academicYear?: number) {
  const db = await requireDb();
  const year = academicYear ?? Number((await getSettings()).academicYear);
  return db.select({ requirement: timetableRequirements, grade: grades, subject: subjects }).from(timetableRequirements).innerJoin(grades, eq(grades.id, timetableRequirements.gradeId)).innerJoin(subjects, eq(subjects.id, timetableRequirements.subjectId)).where(eq(timetableRequirements.academicYear, year)).orderBy(grades.name, subjects.name);
}

export async function setTimetableRequirement(input: { gradeId: number; subjectId: number; academicYear: number; periodsPerWeek: number }, userId: number) {
  const db = await requireDb();
  if (input.periodsPerWeek <= 0) await db.delete(timetableRequirements).where(and(eq(timetableRequirements.gradeId, input.gradeId), eq(timetableRequirements.subjectId, input.subjectId), eq(timetableRequirements.academicYear, input.academicYear)));
  else await db.insert(timetableRequirements).values(input).onDuplicateKeyUpdate({ set: { periodsPerWeek: input.periodsPerWeek } });
  await writeAudit(userId, "timetable.requirement.set", "timetable_requirement", `${input.gradeId}:${input.subjectId}:${input.academicYear}`, input);
}

export async function generateAutomaticTimetable(input: { academicYear?: number; regenerate: boolean; forcePlace?: boolean; days?: number; periodsPerDay?: number; classLessonTotals?: Array<{ gradeId: number; totalLessonsPerWeek: number }> }, userId: number) {
  const db = await requireDb();
  const settings = await getSettings();
  const academicYear = input.academicYear ?? Number(settings.academicYear);
  const days = input.days ?? 5; const periodsPerDay = input.periodsPerDay ?? 8;
  if (input.regenerate) await db.delete(timetableEntries);
  const requirements = await db.select({ requirement: timetableRequirements, grade: grades, subject: subjects }).from(timetableRequirements).innerJoin(grades, eq(grades.id, timetableRequirements.gradeId)).innerJoin(subjects, eq(subjects.id, timetableRequirements.subjectId)).where(eq(timetableRequirements.academicYear, academicYear));
  const validationWarnings: string[] = [];
  for (const requested of input.classLessonTotals ?? []) {
    const classRequirements = requirements.filter(row => row.requirement.gradeId === requested.gradeId);
    const configured = classRequirements.reduce((sum, row) => sum + row.requirement.periodsPerWeek, 0);
    if (requested.totalLessonsPerWeek < configured) validationWarnings.push(`Grade ${requested.gradeId}: configured lessons exceed the requested total`);
    if (requested.totalLessonsPerWeek > configured) validationWarnings.push(`Grade ${requested.gradeId}: requested lessons exceed configured subjects`);
    if (classRequirements.some(row => row.requirement.periodsPerWeek > days)) validationWarnings.push(`Grade ${requested.gradeId}: a subject has more weekly lessons than available school days`);
  }
  const allocations = await db.select().from(teacherAllocations).where(and(eq(teacherAllocations.academicYear, academicYear), eq(teacherAllocations.status, "active")));
  const eligibleByGradeSubject = new Map<string, number[]>();
  for (const allocation of allocations) {
    if (allocation.allocationType === "class_teacher") continue;
    const key = `${allocation.gradeId}:${allocation.subjectId}`;
    eligibleByGradeSubject.set(key, [...(eligibleByGradeSubject.get(key) ?? []), allocation.teacherUserId]);
  }
  const requiredLoadByTeacher = new Map<number, number>();
  for (const allocation of allocations) {
    if (allocation.allocationType === "class_teacher") continue;
    const requirement = requirements.find(row => row.requirement.gradeId === allocation.gradeId && row.requirement.subjectId === allocation.subjectId);
    if (requirement) requiredLoadByTeacher.set(allocation.teacherUserId, (requiredLoadByTeacher.get(allocation.teacherUserId) ?? 0) + requirement.requirement.periodsPerWeek);
  }
  const orderedRequirements = [...requirements].sort((a, b) => {
    const preNoonOrder = Number(isPreNoonTimetableSubject(b.subject.name)) - Number(isPreNoonTimetableSubject(a.subject.name));
    if (preNoonOrder) return preNoonOrder;
    const aLoad = Math.max(...(Array.from(new Set(eligibleByGradeSubject.get(`${a.requirement.gradeId}:${a.requirement.subjectId}`) ?? [])).map(teacherId => requiredLoadByTeacher.get(teacherId) ?? 0)), 0);
    const bLoad = Math.max(...(Array.from(new Set(eligibleByGradeSubject.get(`${b.requirement.gradeId}:${b.requirement.subjectId}`) ?? [])).map(teacherId => requiredLoadByTeacher.get(teacherId) ?? 0)), 0);
    return bLoad - aLoad || b.requirement.periodsPerWeek - a.requirement.periodsPerWeek;
  });
  const preNoonSubjectIds = new Set(requirements.filter(row => isPreNoonTimetableSubject(row.subject.name)).map(row => row.subject.id));
  const existingRows = await db.select().from(timetableEntries);
  const incompatiblePreNoonRows = existingRows.filter(entry => preNoonSubjectIds.has(entry.subjectId) && entry.period > Math.min(5, periodsPerDay));
  if (incompatiblePreNoonRows.length) await db.delete(timetableEntries).where(inArray(timetableEntries.id, incompatiblePreNoonRows.map(entry => entry.id)));
  const existing = timetableEntriesAlignedWithAllocations(existingRows.filter(entry => !incompatiblePreNoonRows.some(row => row.id === entry.id)), allocations);
  const staleIds = existingRows.filter(entry => !existing.some(valid => valid.id === entry.id)).map(entry => entry.id);
  if (staleIds.length) await db.delete(timetableEntries).where(inArray(timetableEntries.id, staleIds));
  const occupied = new Set(existing.map(entry => `${entry.gradeId}:${entry.dayOfWeek}:${entry.period}`)); const subjectDays = new Set(existing.map(entry => `${entry.gradeId}:${entry.subjectId}:${entry.dayOfWeek}`)); const teacherBusy = new Set(existing.map(entry => `${entry.teacherUserId}:${entry.dayOfWeek}:${entry.period}`)); const teacherAtClassSlot = new Map(existing.map(entry => [`${entry.gradeId}:${entry.dayOfWeek}:${entry.period}`, entry.teacherUserId] as const)); const teacherLoad = new Map<number, number>();
  for (const entry of existing) teacherLoad.set(entry.teacherUserId, (teacherLoad.get(entry.teacherUserId) ?? 0) + 1);
  const counts = new Map<string, number>(); for (const entry of existing) counts.set(`${entry.gradeId}:${entry.subjectId}`, (counts.get(`${entry.gradeId}:${entry.subjectId}`) ?? 0) + 1);
  const unplaced: Array<{ grade: string; subject: string; missing: number }> = []; const fallbackConflicts: Array<{ grade: string; subject: string; teacherId: number; day: number; period: number }> = []; let placed = 0;
  for (const row of orderedRequirements) {
    const key = `${row.requirement.gradeId}:${row.requirement.subjectId}`; const needed = Math.max(0, row.requirement.periodsPerWeek - (counts.get(key) ?? 0)); const teachers = Array.from(new Set(eligibleByGradeSubject.get(key) ?? [])); let missing = needed;
    const mustBeBeforeLunch = isPreNoonTimetableSubject(row.subject.name);
    const latestAllowedPeriod = mustBeBeforeLunch ? Math.min(5, periodsPerDay) : periodsPerDay;
    for (let lesson = 0; lesson < needed; lesson += 1) {
      let best: { teacherId: number; day: number; period: number; load: number } | null = null;
      for (let day = 1; day <= days; day += 1) for (let period = 1; period <= latestAllowedPeriod; period += 1) { if (occupied.has(`${row.requirement.gradeId}:${day}:${period}`)) continue; for (const teacherId of teachers) { if (teacherBusy.has(`${teacherId}:${day}:${period}`) || subjectDays.has(`${row.requirement.gradeId}:${row.requirement.subjectId}:${day}`) || hasAdjacentTeacherLesson(teacherAtClassSlot, row.requirement.gradeId, teacherId, day, period)) continue; const load = teacherLoad.get(teacherId) ?? 0; if (!best || load < best.load) best = { teacherId, day, period, load }; } }
      if (!best) continue;
      await db.insert(timetableEntries).values({ gradeId: row.requirement.gradeId, subjectId: row.requirement.subjectId, teacherUserId: best.teacherId, dayOfWeek: best.day, period: best.period, room: null });
      occupied.add(`${row.requirement.gradeId}:${best.day}:${best.period}`); subjectDays.add(`${row.requirement.gradeId}:${row.requirement.subjectId}:${best.day}`); teacherBusy.add(`${best.teacherId}:${best.day}:${best.period}`); teacherAtClassSlot.set(`${row.requirement.gradeId}:${best.day}:${best.period}`, best.teacherId); teacherLoad.set(best.teacherId, best.load + 1); placed += 1; missing -= 1;
    }
    if (missing > 0 && teachers.length) {
      for (let lesson = 0; lesson < missing; lesson += 1) {
        let fallback: { teacherId: number; day: number; period: number } | null = null;
        for (let day = 1; day <= days && !fallback; day += 1) for (let period = 1; period <= latestAllowedPeriod && !fallback; period += 1) {
          if (occupied.has(`${row.requirement.gradeId}:${day}:${period}`) || subjectDays.has(`${row.requirement.gradeId}:${row.requirement.subjectId}:${day}`)) continue;
          // Horizontal conflicts are never acceptable: a teacher's internal user ID
          // must be free at this day/period, regardless of the display code.
          // If every available teacher would be adjacent to another lesson, allow
          // the soft spacing exception, but never reuse a busy teacher slot.
          const availableTeacher = teachers.find(teacherId => !teacherBusy.has(`${teacherId}:${day}:${period}`) && !hasAdjacentTeacherLesson(teacherAtClassSlot, row.requirement.gradeId, teacherId, day, period))
            ?? teachers.find(teacherId => !teacherBusy.has(`${teacherId}:${day}:${period}`));
          if (availableTeacher == null) continue;
          fallback = { teacherId: availableTeacher, day, period };
        }
        if (!fallback) break;
        await db.insert(timetableEntries).values({ gradeId: row.requirement.gradeId, subjectId: row.requirement.subjectId, teacherUserId: fallback.teacherId, dayOfWeek: fallback.day, period: fallback.period, room: null });
        occupied.add(`${row.requirement.gradeId}:${fallback.day}:${fallback.period}`); subjectDays.add(`${row.requirement.gradeId}:${row.requirement.subjectId}:${fallback.day}`); teacherAtClassSlot.set(`${row.requirement.gradeId}:${fallback.day}:${fallback.period}`, fallback.teacherId); teacherLoad.set(fallback.teacherId, (teacherLoad.get(fallback.teacherId) ?? 0) + 1); fallbackConflicts.push({ grade: row.grade.name, subject: row.subject.name, teacherId: fallback.teacherId, day: fallback.day, period: fallback.period }); placed += 1; missing -= 1;
      }
    }
    if (missing > 0) unplaced.push({ grade: row.grade.name, subject: `${row.subject.name}${mustBeBeforeLunch ? " (pre-lunch constraint)" : ""}`, missing });
  }
  if (input.regenerate && unplaced.length) {
    await db.delete(timetableEntries);
    occupied.clear(); subjectDays.clear(); teacherBusy.clear(); teacherAtClassSlot.clear(); teacherLoad.clear(); counts.clear(); unplaced.length = 0; fallbackConflicts.length = 0; placed = 0;
    for (const row of orderedRequirements) {
      const key = `${row.requirement.gradeId}:${row.requirement.subjectId}`; const teachers = Array.from(new Set(eligibleByGradeSubject.get(key) ?? [])); const mustBeBeforeLunch = isPreNoonTimetableSubject(row.subject.name); const latestAllowedPeriod = mustBeBeforeLunch ? Math.min(5, periodsPerDay) : periodsPerDay; let missing = row.requirement.periodsPerWeek;
      for (let lesson = 0; lesson < row.requirement.periodsPerWeek; lesson += 1) {
        let best: { teacherId: number; day: number; period: number; dayLoad: number } | null = null;
        for (let day = 1; day <= days; day += 1) {
          if (subjectDays.has(`${row.requirement.gradeId}:${row.requirement.subjectId}:${day}`)) continue;
          const dayLoad = Array.from(occupied).filter(keyValue => keyValue.startsWith(`${row.requirement.gradeId}:${day}:`)).length;
          for (let period = 1; period <= latestAllowedPeriod; period += 1) {
            if (occupied.has(`${row.requirement.gradeId}:${day}:${period}`) || !teachers.length) continue;
            const availableTeachers = teachers.filter(candidate => !teacherBusy.has(`${candidate}:${day}:${period}`) && !hasAdjacentTeacherLesson(teacherAtClassSlot, row.requirement.gradeId, candidate, day, period));
            const nonBusyTeachers = teachers.filter(candidate => !teacherBusy.has(`${candidate}:${day}:${period}`));
            const candidateTeachers = availableTeachers.length ? availableTeachers : nonBusyTeachers;
            if (!candidateTeachers.length) continue;
            const teacherId = candidateTeachers.reduce((selected, candidate) => (teacherLoad.get(candidate) ?? 0) < (teacherLoad.get(selected) ?? Number.MAX_SAFE_INTEGER) ? candidate : selected, candidateTeachers[0]);
            if (!best || dayLoad < best.dayLoad) best = { teacherId, day, period, dayLoad };
          }
        }
        if (!best) break;
        await db.insert(timetableEntries).values({ gradeId: row.requirement.gradeId, subjectId: row.requirement.subjectId, teacherUserId: best.teacherId, dayOfWeek: best.day, period: best.period, room: null });
        occupied.add(`${row.requirement.gradeId}:${best.day}:${best.period}`); subjectDays.add(`${row.requirement.gradeId}:${row.requirement.subjectId}:${best.day}`); teacherBusy.add(`${best.teacherId}:${best.day}:${best.period}`); teacherAtClassSlot.set(`${row.requirement.gradeId}:${best.day}:${best.period}`, best.teacherId); teacherLoad.set(best.teacherId, (teacherLoad.get(best.teacherId) ?? 0) + 1); placed += 1; missing -= 1;
      }
      if (missing > 0) unplaced.push({ grade: row.grade.name, subject: `${row.subject.name}${mustBeBeforeLunch ? " (pre-lunch constraint)" : ""}`, missing });
    }
  }
  const generatedRows = await db.select().from(timetableEntries);
  const duplicateSubjectDays = generatedRows.reduce((set, entry) => { const key = `${entry.gradeId}:${entry.subjectId}:${entry.dayOfWeek}`; if (set.has(key)) set.add(`DUPLICATE:${key}`); else set.add(key); return set; }, new Set<string>());
  const duplicateCount = Array.from(duplicateSubjectDays).filter(key => key.startsWith("DUPLICATE:")).length;
  if (duplicateCount) validationWarnings.push(`${duplicateCount} duplicate subject-day record(s) detected after generation`);
  await writeAudit(userId, "timetable.generate.automatic", "timetable", null, { academicYear, placed, unplaced, fallbackConflicts, validationWarnings, duplicateCount, regenerate: input.regenerate, forcePlace: Boolean(input.forcePlace) });
  return { placed, unplaced, fallbackConflicts, validationWarnings, regenerated: input.regenerate, requirements: requirements.length, slots: days * periodsPerDay };
}

export async function getIntegratedReportCard(input: { learnerId: number; academicYear?: number; term?: string }, userId: number) {
  const db = await requireDb();
  const settings = await getSettings(); const academicYear = input.academicYear ?? settings.academicYear; const term = input.term ?? settings.currentTerm;
  const learnerRow = (await db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(eq(learners.id, input.learnerId)).limit(1))[0];
  if (!learnerRow) throw new Error("LEARNER_NOT_FOUND");
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (actor?.role === "user") {
    const allowed = await db.select().from(teacherAllocations).where(and(eq(teacherAllocations.teacherUserId, userId), eq(teacherAllocations.gradeId, learnerRow.learner.gradeId), eq(teacherAllocations.status, "active"))).limit(1);
    if (!allowed.length) throw new Error("REPORT_SCOPE_FORBIDDEN");
  }
  const markRows = await db.select({ mark: marks, assessment: assessments, subject: subjects }).from(marks).innerJoin(assessments, eq(assessments.id, marks.assessmentId)).innerJoin(subjects, eq(subjects.id, marks.subjectId)).where(eq(marks.learnerId, input.learnerId));
  const valid = markRows.filter(row => row.assessment.academicYear === academicYear && row.assessment.term === term && row.assessment.gradeId === learnerRow.learner.gradeId).sort((a,b) => b.assessment.id - a.assessment.id);
  const approved = valid.filter(row => row.assessment.status === "approved"); const source = approved.length ? approved : valid;
  const seen = new Set<number>(); const marksheet = source.filter(row => { const entered = row.mark.score != null || row.mark.midTerm != null || row.mark.endTerm != null || row.mark.average != null || row.mark.cbcLevel != null || row.mark.teacherRemark != null; if (!entered || seen.has(row.mark.subjectId)) return false; seen.add(row.mark.subjectId); return true; }).map(row => ({ subject: row.subject, midTerm: row.mark.midTerm == null ? null : Number(row.mark.midTerm), endTerm: row.mark.endTerm == null ? null : Number(row.mark.endTerm), average: row.mark.average == null ? (row.mark.score == null ? null : Number(row.mark.score)) : Number(row.mark.average), cbcLevel: row.mark.cbcLevel, teacherRemark: row.mark.teacherRemark, assessmentStatus: row.assessment.status }));
  const attendanceRows = await db.select().from(attendances).where(eq(attendances.learnerId, input.learnerId));
  const present = attendanceRows.filter(row => row.status === "present" || row.status === "late").length; const absent = attendanceRows.filter(row => row.status === "absent").length;
  const allocationRows = await db.select({ allocation: teacherAllocations, staff: staffProfiles }).from(teacherAllocations).leftJoin(staffProfiles, eq(staffProfiles.userId, teacherAllocations.teacherUserId)).where(and(eq(teacherAllocations.gradeId, learnerRow.learner.gradeId), eq(teacherAllocations.status, "active")));
  const classTeacher = learnerRow.grade?.classTeacherUserId ? (await db.select().from(staffProfiles).where(eq(staffProfiles.userId, learnerRow.grade.classTeacherUserId)).limit(1))[0]?.displayName : null;
  const fees = settings.includeFeesOnReportCard ? await getFinanceOverview(input.learnerId) : null;
  const existing = (await db.select().from(reportCards).where(and(eq(reportCards.learnerId, input.learnerId), eq(reportCards.academicYear, academicYear), eq(reportCards.term, term))).limit(1))[0];
  if (!existing) await db.insert(reportCards).values({ learnerId: input.learnerId, academicYear, term, status: "draft", generatedByUserId: userId }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const record = (await db.select().from(reportCards).where(and(eq(reportCards.learnerId, input.learnerId), eq(reportCards.academicYear, academicYear), eq(reportCards.term, term))).limit(1))[0];
  const levels = marksheet.map(row => row.cbcLevel).filter((level): level is NonNullable<typeof level> => level !== null);
  const overall = levels.length ? (levels.filter(level => level.startsWith("EE")).length >= Math.ceil(levels.length / 2) ? "EE" : levels.filter(level => level.startsWith("ME")).length >= Math.ceil(levels.length / 2) ? "ME" : levels.filter(level => level.startsWith("BE")).length >= Math.ceil(levels.length / 2) ? "BE" : "AE") : null;
  return { learner: learnerRow.learner, grade: learnerRow.grade, settings, academicYear, term, marksheet, attendance: { openingDays: attendanceRows.length, present, absent, percentage: attendanceRows.length ? Math.round((present / attendanceRows.length) * 100) : 0 }, classTeacher, allocations: allocationRows, finance: fees, report: record, overall };
}

export async function saveReportCardComments(input: { learnerId: number; academicYear: number; term: string; assessmentType?: "mid_term" | "end_term"; classTeacherComment?: string | null; headTeacherComment?: string | null }, userId: number) {
  const db = await requireDb(); await db.insert(reportCards).values({ ...input, assessmentType: input.assessmentType ?? "end_term", status: "draft", generatedByUserId: userId }).onDuplicateKeyUpdate({ set: { classTeacherComment: input.classTeacherComment ?? null, headTeacherComment: input.headTeacherComment ?? null } }); await writeAudit(userId, "report_card.comments.save", "report_card", `${input.learnerId}:${input.academicYear}:${input.term}:${input.assessmentType ?? "end_term"}`, input); return { ok: true };
}

export async function setReportCardStatus(input: { learnerId: number; academicYear: number; term: string; assessmentType?: "mid_term" | "end_term"; status: "draft" | "generated" | "reviewed" | "approved" | "published" }, userId: number) {
  const db = await requireDb(); await db.insert(reportCards).values({ learnerId: input.learnerId, academicYear: input.academicYear, term: input.term, assessmentType: input.assessmentType ?? "end_term", status: input.status, generatedByUserId: userId }).onDuplicateKeyUpdate({ set: { status: input.status } }); await writeAudit(userId, `report_card.status.${input.status}`, "report_card", `${input.learnerId}:${input.academicYear}:${input.term}:${input.assessmentType ?? "end_term"}`, input); return { ok: true, status: input.status };
}

export async function listCommunications() {
  const db = await requireDb();
  return db.select().from(communications).orderBy(desc(communications.createdAt)).limit(100);
}

export async function createCommunication(input: { audience: "parents" | "staff" | "learners" | "all"; channel: "sms" | "notice" | "email"; subject: string; body: string }, userId: number) {
  const db = await requireDb();
  await db.insert(communications).values({ ...input, createdByUserId: userId, status: "draft" });
  await writeAudit(userId, "communication.create", "communication", null, { audience: input.audience, channel: input.channel });
  return { ok: true, status: "draft" };
}

export async function listAlumni(userId = 0) {
  const db = await requireDb();
  const finalRows = await db.select({ learner: learners, grade: grades }).from(learners).innerJoin(grades, eq(grades.id, learners.gradeId)).where(eq(learners.status, "active"));
  const finalGrades = new Set(["PP2", "Grade 6", "Grade 9", "Grade 12"]);
  for (const row of finalRows.filter(item => finalGrades.has(item.grade.name))) {
    const existing = (await db.select({ id: alumni.id }).from(alumni).where(eq(alumni.learnerId, row.learner.id)).limit(1))[0];
    if (!existing) { await db.insert(alumni).values({ learnerId: row.learner.id, completionYear: new Date().getFullYear(), destination: null, archivedByUserId: userId }); await db.update(learners).set({ status: "archived" }).where(eq(learners.id, row.learner.id)); }
  }
  return db.select({ alumni: alumni, learner: learners }).from(alumni).innerJoin(learners, eq(learners.id, alumni.learnerId)).orderBy(desc(alumni.completionYear));
}

export async function archiveLearner(input: { learnerId: number; completionYear: number; destination?: string | null }, userId: number) {
  const db = await requireDb();
  await db.insert(alumni).values({ ...input, archivedByUserId: userId });
  await db.update(learners).set({ status: "archived" }).where(eq(learners.id, input.learnerId));
  await writeAudit(userId, "alumni.archive", "learner", input.learnerId, input);
  return { ok: true };
}

export async function listStaff(search?: string, userId?: number) {
  const db = await requireDb();
  const term = search?.trim();
  const schoolId = userId == null ? null : await actorSchoolId(userId);
  return db.select({ profile: staffProfiles, user: users }).from(staffProfiles).leftJoin(users, eq(users.id, staffProfiles.userId)).where(and(schoolId == null ? undefined : eq(staffProfiles.schoolId, schoolId), term ? or(like(staffProfiles.displayName, `%${term}%`), like(staffProfiles.email, `%${term}%`), like(staffProfiles.phone, `%${term}%`), like(staffProfiles.role, `%${term}%`), like(staffProfiles.status, `%${term}%`)) : undefined)).orderBy(staffProfiles.displayName);
}

export async function listStaffPage(input: { search?: string; page?: number; pageSize?: number }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const { page, pageSize, offset } = peoplePageWindow(input.page, input.pageSize);
  const term = input.search?.trim();
  const where = and(eq(staffProfiles.schoolId, schoolId), term ? or(like(staffProfiles.displayName, `%${term}%`), like(staffProfiles.email, `%${term}%`), like(staffProfiles.phone, `%${term}%`), like(staffProfiles.role, `%${term}%`), like(staffProfiles.status, `%${term}%`)) : undefined);
  const [rows, totalRows] = await Promise.all([
    db.select({ profile: staffProfiles, user: users }).from(staffProfiles).leftJoin(users, eq(users.id, staffProfiles.userId)).where(where).orderBy(staffProfiles.displayName).limit(pageSize).offset(offset),
    db.select({ total: count(staffProfiles.id) }).from(staffProfiles).where(where),
  ]);
  return { rows, total: Number(totalRows[0]?.total ?? 0), page, pageSize };
}

async function nextStaffCode() {
  const db = await requireDb();
  const result = (await db.select({ maxCode: sql<number>`coalesce(max(${staffProfiles.teacherCode}), 0)` }).from(staffProfiles))[0];
  return Number(result?.maxCode ?? 0) + 1;
}

function staffUsername(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 42);
  return base || `staff.${Date.now()}`;
}

export async function createStaff(input: { displayName: string; title?: string | null; designation?: string | null; phone?: string | null; email?: string | null; teacherCode?: number | null; assignedGradeId?: number | null; role: PeopleStaffRole; status: PeopleStaffStatus }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("STAFF_NAME_REQUIRED");
  const code = input.teacherCode ?? await nextStaffCode();
  if (code < 1 || code > 999) throw new Error("INVALID_TEACHER_CODE");
  const existingCodeOwner = (await db.select({ id: staffProfiles.id }).from(staffProfiles).where(and(eq(staffProfiles.teacherCode, code), eq(staffProfiles.schoolId, schoolId))).limit(1))[0];
  if (existingCodeOwner) {
    await db.update(staffProfiles).set({ teacherCode: null }).where(eq(staffProfiles.id, existingCodeOwner.id));
    await writeAudit(userId, "staff.teacher_code.cleared", "staff_profile", existingCodeOwner.id, { previousCode: code, reassignedToNewStaff: displayName });
  }
  const base = staffUsername(displayName);
  let username = base; let suffix = 2;
  while ((await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1)).length) username = `${base}.${suffix++}`;
  const userRow = (await db.insert(users).values({ schoolId, openId: `people-staff-${randomUUID()}`, username, name: displayName, email: input.email?.trim() || null, role: "user", accountStatus: input.status === "active" ? "active" : "disabled", loginMethod: "people_registry", lastSignedIn: new Date() }).$returningId())[0];
  try {
    const staffRow = (await db.insert(staffProfiles).values({ schoolId, userId: userRow.id, teacherCode: code, title: input.title?.trim() || null, displayName, designation: input.designation?.trim() || null, email: input.email?.trim() || null, phone: input.phone?.trim() || null, role: input.role, status: input.status === "active" ? "active" : "disabled" }).$returningId())[0];
    if (input.role === "class_teacher" && input.assignedGradeId) {
      const grade = (await db.select().from(grades).where(and(eq(grades.id, input.assignedGradeId), eq(grades.schoolId, schoolId))).limit(1))[0];
      if (!grade) throw new Error("GRADE_NOT_FOUND");
      if (grade.classTeacherUserId && grade.classTeacherUserId !== userRow.id) throw new Error("CLASS_TEACHER_ALREADY_ASSIGNED");
      await db.update(grades).set({ classTeacherUserId: userRow.id }).where(eq(grades.id, input.assignedGradeId));
    }
    await writeAudit(userId, "staff.create", "staff_profile", staffRow.id, { userId: userRow.id, teacherCode: code, role: input.role, status: input.status });
    return { ok: true, id: staffRow.id, userId: userRow.id, teacherCode: code, username };
  } catch (error) {
    await db.delete(staffProfiles).where(eq(staffProfiles.userId, userRow.id));
    await db.delete(users).where(eq(users.id, userRow.id));
    throw error;
  }
}

export async function updateStaff(input: { staffProfileId: number; displayName: string; title?: string | null; designation?: string | null; phone?: string | null; email?: string | null; teacherCode?: number | null; assignedGradeId?: number | null; role: PeopleStaffRole; status: PeopleStaffStatus }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const current = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.schoolId, schoolId))).limit(1))[0];
  if (!current) throw new Error("STAFF_NOT_FOUND");
  const displayName = input.displayName.trim(); if (!displayName) throw new Error("STAFF_NAME_REQUIRED");
  if (input.teacherCode != null) {
    if (input.teacherCode < 1 || input.teacherCode > 999) throw new Error("INVALID_TEACHER_CODE");
    const other = (await db.select({ id: staffProfiles.id }).from(staffProfiles).where(and(eq(staffProfiles.teacherCode, input.teacherCode), eq(staffProfiles.schoolId, schoolId))).limit(1))[0];
    if (other && other.id !== input.staffProfileId) {
      await db.update(staffProfiles).set({ teacherCode: null }).where(and(eq(staffProfiles.id, other.id), eq(staffProfiles.schoolId, schoolId)));
      await writeAudit(userId, "staff.teacher_code.cleared", "staff_profile", other.id, { replacedByStaffProfileId: input.staffProfileId, previousCode: input.teacherCode });
    }
  }
  await db.update(staffProfiles).set({ displayName, teacherCode: input.teacherCode ?? current.teacherCode, title: input.title?.trim() || null, designation: input.designation?.trim() || null, email: input.email?.trim() || null, phone: input.phone?.trim() || null, role: input.role, status: input.status === "active" ? "active" : "disabled" }).where(eq(staffProfiles.id, input.staffProfileId));
  if (input.assignedGradeId) {
    const grade = (await db.select().from(grades).where(and(eq(grades.id, input.assignedGradeId), eq(grades.schoolId, schoolId))).limit(1))[0];
    if (!grade) throw new Error("GRADE_NOT_FOUND");
    if (grade.classTeacherUserId && grade.classTeacherUserId !== current.userId) throw new Error("CLASS_TEACHER_ALREADY_ASSIGNED");
    await db.update(grades).set({ classTeacherUserId: null }).where(and(eq(grades.classTeacherUserId, current.userId), eq(grades.schoolId, schoolId)));
    await db.update(grades).set({ classTeacherUserId: current.userId }).where(and(eq(grades.id, input.assignedGradeId), eq(grades.schoolId, schoolId)));
  }
  await db.update(users).set({ name: displayName, email: input.email?.trim() || null, accountStatus: input.status === "active" ? "active" : "disabled" }).where(eq(users.id, current.userId));
  await writeAudit(userId, "staff.update", "staff_profile", input.staffProfileId, { role: input.role, status: input.status });
  return { ok: true };
}

export async function restoreStaffProfile(input: { staffProfileId: number }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const actor = (await db.select({ user: users, staff: staffProfiles }).from(users).leftJoin(staffProfiles, eq(staffProfiles.userId, users.id)).where(eq(users.id, userId)).limit(1))[0];
  if (actor?.user.role !== "admin" && actor?.staff?.role !== "super_admin") throw new Error("SUPER_ADMIN_REQUIRED");
  const target = (await db.select({ profile: staffProfiles, user: users }).from(staffProfiles).innerJoin(users, eq(users.id, staffProfiles.userId)).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.schoolId, schoolId), eq(users.schoolId, schoolId))).limit(1))[0];
  if (!target) throw new Error("STAFF_NOT_FOUND");
  if (target.profile.status === "active" && target.user.accountStatus === "active") throw new Error("STAFF_ALREADY_ACTIVE");
  await db.transaction(async tx => {
    await tx.update(staffProfiles).set({ status: "active" }).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.schoolId, schoolId)));
    await tx.update(users).set({ accountStatus: "active" }).where(and(eq(users.id, target.user.id), eq(users.schoolId, schoolId)));
    await tx.insert(auditLogs).values({ schoolId, userId, action: "staff.restore", entityType: "staff_profile", entityId: String(input.staffProfileId), metadata: JSON.stringify({ restoredUserId: target.user.id, displayName: target.profile.displayName }) });
  });
  return { ok: true, displayName: target.profile.displayName };
}

export async function setStaffStatus(input: { staffProfileId: number; status: PeopleStaffStatus }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const current = (await db.select().from(staffProfiles).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.schoolId, schoolId))).limit(1))[0];
  if (!current) throw new Error("STAFF_NOT_FOUND");
  await db.update(staffProfiles).set({ status: input.status === "active" ? "active" : "disabled" }).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.schoolId, schoolId)));
  await db.update(users).set({ accountStatus: input.status === "active" ? "active" : "disabled" }).where(and(eq(users.id, current.userId), eq(users.schoolId, schoolId)));
  await writeAudit(userId, `staff.${input.status}`, "staff_profile", input.staffProfileId, input);
  return { ok: true };
}

/** Removes a staff identity from live People, allocation, and timetable selections while preserving the disabled login shell and audit/history records. */
export async function deleteStaffProfile(input: { staffProfileId: number }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const current = (await db.select({ profile: staffProfiles, user: users }).from(staffProfiles).innerJoin(users, eq(users.id, staffProfiles.userId)).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.schoolId, schoolId), eq(users.schoolId, schoolId))).limit(1))[0];
  if (!current) throw new Error("STAFF_NOT_FOUND");
  if (current.user.id === userId) throw new Error("CANNOT_DELETE_CURRENT_ACCOUNT");
  if (current.profile.role === "super_admin") throw new Error("CANNOT_DELETE_PLATFORM_SUPER_ADMIN");
  // Historical assessments and marks deliberately remain linked to the user id. Only the live
  // staff profile, active allocations, timetable entries and class-teacher link are removed.
  await db.transaction(async tx => {
    await tx.insert(auditLogs).values({ schoolId, userId, action: "staff.delete", entityType: "staff_profile", entityId: String(input.staffProfileId), metadata: JSON.stringify({ userId: current.user.id, displayName: current.profile.displayName, liveLinksRemoved: ["teacher_allocations", "timetable_entries", "class_teacher_assignment"], historicalRecordsRetained: true }) });
    await tx.delete(timetableEntries).where(eq(timetableEntries.teacherUserId, current.user.id));
    await tx.delete(teacherAllocations).where(eq(teacherAllocations.teacherUserId, current.user.id));
    await tx.update(grades).set({ classTeacherUserId: null }).where(and(eq(grades.classTeacherUserId, current.user.id), eq(grades.schoolId, schoolId)));
    await tx.delete(staffProfiles).where(and(eq(staffProfiles.id, input.staffProfileId), eq(staffProfiles.schoolId, schoolId)));
    await tx.update(users).set({ accountStatus: "disabled" }).where(and(eq(users.id, current.user.id), eq(users.schoolId, schoolId)));
  });
  return { ok: true };
}

export type PeopleImportKind = "learners" | "staff";
export type PeopleImportRow = Record<string, unknown>;
export type PeopleImportOptions = { autoCreateMissingClasses?: boolean };

function textValue(row: PeopleImportRow, key: string) {
  const value = row[key]; return value == null ? "" : String(value).trim();
}

function normalizedImportKey(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function importTextValue(row: PeopleImportRow, ...keys: string[]) {
  const wanted = new Set(keys.map(normalizedImportKey));
  const found = Object.entries(row).find(([key, value]) => wanted.has(normalizedImportKey(key)) && value != null && String(value).trim() !== "");
  return found ? String(found[1]).trim() : "";
}
function normalizedClassPart(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
export function resolveImportGrade(gradeRows: Array<{ id: number; name: string; stream: string | null }>, gradeName: string, stream: string) {
  const normalizedName = normalizedClassPart(gradeName);
  const normalizedStream = normalizedClassPart(stream);
  const exact = gradeRows.find(item => normalizedClassPart(item.name) === normalizedName && normalizedClassPart(item.stream ?? "") === normalizedStream);
  if (exact) return exact;

  // Older workbooks may combine grade and stream in one field, or carry a stale
  // stream label in a separate field. If the grade has exactly one existing
  // class, resolve to that class; ambiguous grades remain validation errors.
  const candidates = gradeRows.filter(item => {
    const base = normalizedClassPart(item.name);
    return normalizedName === base || normalizedName.startsWith(`${base} `);
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}
function deriveMissingClassParts(gradeRows: Array<{ name: string; stream: string | null }>, gradeName: string, stream: string) {
  const cleanName = gradeName.trim().replace(/\s+/g, " ");
  const matchingBase = gradeRows.map(row => row.name.trim()).filter(name => cleanName.toLowerCase().startsWith(`${name.toLowerCase()} `)).sort((a, b) => b.length - a.length)[0];
  if (matchingBase) return { name: matchingBase, stream: cleanName.slice(matchingBase.length).trim() || stream.trim().replace(/\s+/g, " ") || null };
  if (stream.trim()) return { name: cleanName, stream: stream.trim().replace(/\s+/g, " ") };
  const parts = cleanName.split(" ");
  return parts.length > 1 ? { name: parts.slice(0, -1).join(" "), stream: parts.at(-1) ?? null } : { name: cleanName, stream: null };
}
async function ensureImportedGrade(gradeName: string, stream: string, userId: number) {
  const db = await requireDb();
  const gradeRows = await db.select().from(grades);
  const parts = deriveMissingClassParts(gradeRows, gradeName, stream);
  const existing = (await db.select().from(grades).where(parts.stream
    ? and(eq(grades.name, parts.name), eq(grades.stream, parts.stream))
    : and(eq(grades.name, parts.name), sql`${grades.stream} IS NULL`)).limit(1))[0];
  if (existing) return existing;
  try {
    const inserted = (await db.insert(grades).values({ name: parts.name, stream: parts.stream }).$returningId())[0];
    await writeAudit(userId, "grade.create.import", "grade", inserted.id, { name: parts.name, stream: parts.stream, source: "learner_bulk_import" });
  } catch {
    // A concurrent import may have created the same class; use that canonical row.
  }
  return (await db.select().from(grades).where(parts.stream
    ? and(eq(grades.name, parts.name), eq(grades.stream, parts.stream))
    : and(eq(grades.name, parts.name), sql`${grades.stream} IS NULL`)).limit(1))[0];
}
export async function previewPeopleImport(input: { kind: PeopleImportKind; rows: PeopleImportRow[]; rowOffset?: number } & PeopleImportOptions) {
  const db = await requireDb();
  const errors: Array<{ row: number; message: string }> = [];
  const preview: Array<Record<string, unknown>> = [];
  if (!input.rows.length) return { kind: input.kind, total: 0, valid: 0, errors: [{ row: 0, message: "The workbook contains no data rows." }], preview };
  if (input.rows.length > 500) return { kind: input.kind, total: input.rows.length, valid: 0, errors: [{ row: 0, message: "Import limit is 500 rows per confirmation." }], preview };
  const gradeRows = await db.select().from(grades);
  const existingAdmissions = new Set<string>();
  if (input.kind === "learners") {
    const admissionNumbers = input.rows.map(row => importTextValue(row, "admissionNumber", "admissionNo", "admission").toUpperCase()).filter(Boolean);
    if (admissionNumbers.length) {
      const existing = await db.select({ admissionNumber: learners.admissionNumber }).from(learners).where(inArray(learners.admissionNumber, admissionNumbers));
      existing.forEach(row => existingAdmissions.add(row.admissionNumber.toUpperCase()));
    }
  }
  const seenAdmissions = new Set<string>();
  for (let index = 0; index < input.rows.length; index += 1) {
    const row = input.rows[index];
    const rowNumber = (input.rowOffset ?? 0) + index + 2;
    if (input.kind === "learners") {
      const fullName = importTextValue(row, "learnerName", "fullName", "name");
      const admissionNumber = importTextValue(row, "admissionNumber", "admissionNo", "admission").toUpperCase();
      const gradeName = importTextValue(row, "gradeName", "grade", "class", "gradeClass");
      const stream = importTextValue(row, "stream", "streamName");
      const grade = resolveImportGrade(gradeRows, gradeName, stream);
      const rawStatus = importTextValue(row, "status", "state").toLowerCase();
      const status = rawStatus === "inactive" ? "inactive" : "active";
      if (rawStatus && rawStatus !== "active" && rawStatus !== "inactive") errors.push({ row: rowNumber, message: "Status must be active or inactive." });
      if (!fullName) errors.push({ row: rowNumber, message: "Learner name is required." });
      if (!admissionNumber) errors.push({ row: rowNumber, message: "Admission number is required." });
      if (!gradeName) errors.push({ row: rowNumber, message: "Grade/class is required." });
      if (seenAdmissions.has(admissionNumber)) errors.push({ row: rowNumber, message: `Duplicate admission number in workbook: ${admissionNumber}.` });
      if (admissionNumber && existingAdmissions.has(admissionNumber)) errors.push({ row: rowNumber, message: `Admission number already exists: ${admissionNumber}.` });
      if (!grade && !(input.kind === "learners" && input.autoCreateMissingClasses)) errors.push({ row: rowNumber, message: `Grade/class not found: ${gradeName}${stream ? ` ${stream}` : ""}. Use an exact Grade/Class value from the Add Learner list or enable automatic class creation.` });
      seenAdmissions.add(admissionNumber);
      if (fullName && admissionNumber && gradeName && (grade || (input.kind === "learners" && input.autoCreateMissingClasses))) preview.push({ row: rowNumber, learnerName: fullName, admissionNumber, gradeId: grade?.id ?? 0, grade: grade ? `${grade.name}${grade.stream ? ` ${grade.stream}` : ""}` : `${gradeName}${stream ? ` ${stream}` : ""}`, sourceGradeName: gradeName, sourceStream: stream || null, guardianName: importTextValue(row, "guardianName", "parentGuardianName", "parentName", "guardian") || null, guardianIdNumber: importTextValue(row, "guardianIdNumber", "parentGuardianId", "parentId", "guardianId") || null, guardianPhone: importTextValue(row, "guardianPhone", "parentGuardianPhone", "parentPhone", "guardianPhoneNumber") || null, status });
    } else {
      const displayName = importTextValue(row, "staffName", "displayName", "name", "teacherName");
      const role = (importTextValue(row, "role", "systemRole", "designationRole") || "teacher") as PeopleStaffRole;
      const allowedRoles: PeopleStaffRole[] = ["admin", "class_teacher", "teacher", "finance"];
      if (!displayName) errors.push({ row: rowNumber, message: "Staff name is required." });
      if (!allowedRoles.includes(role)) errors.push({ row: rowNumber, message: `Unknown staff role: ${role}.` });
      const rawStatus = importTextValue(row, "status", "state").toLowerCase();
      const email = importTextValue(row, "email", "emailAddress");
      const status = rawStatus === "inactive" ? "inactive" : "active";
      if (rawStatus && rawStatus !== "active" && rawStatus !== "inactive") errors.push({ row: rowNumber, message: "Status must be active or inactive." });
      if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push({ row: rowNumber, message: "Email format is invalid." });
      if (displayName && allowedRoles.includes(role)) preview.push({ row: rowNumber, displayName, title: importTextValue(row, "title") || null, designation: importTextValue(row, "designation", "roleLabel", "jobTitle") || null, phone: importTextValue(row, "phone", "phoneNumber", "mobile") || null, email: email || null, role, status });
    }
  }
  return { kind: input.kind, total: input.rows.length, valid: preview.length, errors, preview };
}

export async function importPeopleRows(input: { kind: PeopleImportKind; rows: PeopleImportRow[] } & PeopleImportOptions, userId: number) {
  const checked = await previewPeopleImport(input);
  if (checked.errors.length) throw new Error(`IMPORT_VALIDATION_FAILED:${JSON.stringify(checked.errors.slice(0, 10))}`);
  let created = 0;
  const learnerIds: number[] = [];
  const staffProfileIds: number[] = [];
  const userIds: number[] = [];
  for (const row of checked.preview as Array<Record<string, unknown>>) {
    if (input.kind === "learners") {
      const grade = Number(row.gradeId) > 0 ? { id: Number(row.gradeId) } : await ensureImportedGrade(String(row.sourceGradeName ?? row.grade ?? ""), String(row.sourceStream ?? ""), userId);
      if (!grade) throw new Error("IMPORT_CLASS_CREATION_FAILED");
      const createdLearner = await createLearner({ fullName: String(row.learnerName), admissionNumber: String(row.admissionNumber), guardianName: row.guardianName ? String(row.guardianName) : null, guardianIdNumber: row.guardianIdNumber ? String(row.guardianIdNumber) : null, guardianPhone: row.guardianPhone ? String(row.guardianPhone) : null, gradeId: grade.id, status: row.status === "inactive" ? "inactive" : "active" }, userId);
      learnerIds.push(createdLearner.id);
    } else {
      const createdStaff = await createStaff({ displayName: String(row.displayName), title: row.title ? String(row.title) : null, designation: row.designation ? String(row.designation) : null, phone: row.phone ? String(row.phone) : null, email: row.email ? String(row.email) : null, role: String(row.role) as PeopleStaffRole, status: row.status === "inactive" ? "inactive" : "active" }, userId);
      staffProfileIds.push(createdStaff.id); userIds.push(createdStaff.userId);
    }
    created += 1;
  }
  await writeAudit(userId, "people.bulk_import", input.kind, null, { rows: created, learnerIds, staffProfileIds, userIds, undoable: true });
  return { ok: true, created };
}

type ImportBatch = { auditId: number; kind: PeopleImportKind; createdAt: Date; rows: number; learnerIds: number[]; staffProfileIds: number[]; userIds: number[] };
export const PEOPLE_IMPORT_UNDO_WINDOW_MS = 60 * 60 * 1000;
export function isPeopleImportUndoable(createdAt: Date, now = Date.now()) { return now - createdAt.getTime() <= PEOPLE_IMPORT_UNDO_WINDOW_MS; }

function parseImportBatch(row: typeof auditLogs.$inferSelect): ImportBatch | null {
  if (row.action !== "people.bulk_import" || !row.entityType || !["learners", "staff"].includes(row.entityType)) return null;
  try {
    const metadata = JSON.parse(row.metadata ?? "{}") as Record<string, unknown>;
    if (metadata.undoable !== true) return null;
    return { auditId: row.id, kind: row.entityType as PeopleImportKind, createdAt: row.createdAt, rows: Number(metadata.rows ?? 0), learnerIds: Array.isArray(metadata.learnerIds) ? metadata.learnerIds.map(Number).filter(Number.isInteger) : [], staffProfileIds: Array.isArray(metadata.staffProfileIds) ? metadata.staffProfileIds.map(Number).filter(Number.isInteger) : [], userIds: Array.isArray(metadata.userIds) ? metadata.userIds.map(Number).filter(Number.isInteger) : [] };
  } catch { return null; }
}

export async function getLastPeopleImport() {
  const db = await requireDb();
  const rows = await db.select().from(auditLogs).where(eq(auditLogs.action, "people.bulk_import")).orderBy(desc(auditLogs.createdAt)).limit(20);
  const batch = rows.map(parseImportBatch).find((item): item is ImportBatch => item !== null && isPeopleImportUndoable(item.createdAt));
  return batch ? { ...batch, createdAt: batch.createdAt.toISOString() } : null;
}

export async function undoLastPeopleImport(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(auditLogs).where(eq(auditLogs.action, "people.bulk_import")).orderBy(desc(auditLogs.createdAt)).limit(20);
  const batch = rows.map(parseImportBatch).find((item): item is ImportBatch => item !== null && isPeopleImportUndoable(item.createdAt));
  if (!batch) throw new Error("NO_UNDOABLE_IMPORT");
  const blockedLearners: number[] = [];
  const blockedStaff: number[] = [];
  for (const learnerId of batch.learnerIds) {
    const [markRows, attendanceRows, paymentRows] = await Promise.all([
      db.select({ id: marks.id }).from(marks).where(eq(marks.learnerId, learnerId)).limit(1),
      db.select({ id: attendances.id }).from(attendances).where(eq(attendances.learnerId, learnerId)).limit(1),
      db.select({ id: payments.id }).from(payments).where(eq(payments.learnerId, learnerId)).limit(1),
    ]);
    if (markRows.length || attendanceRows.length || paymentRows.length) blockedLearners.push(learnerId);
  }
  for (const staffProfileId of batch.staffProfileIds) {
    const profile = (await db.select({ userId: staffProfiles.userId }).from(staffProfiles).where(eq(staffProfiles.id, staffProfileId)).limit(1))[0];
    if (!profile) continue;
    const [timetableRows, allocationRows, assessmentRows, markRows] = await Promise.all([
      db.select({ id: timetableEntries.id }).from(timetableEntries).where(eq(timetableEntries.teacherUserId, profile.userId)).limit(1),
      db.select({ id: teacherAllocations.id }).from(teacherAllocations).where(eq(teacherAllocations.teacherUserId, profile.userId)).limit(1),
      db.select({ id: assessments.id }).from(assessments).where(eq(assessments.teacherUserId, profile.userId)).limit(1),
      db.select({ id: marks.id }).from(marks).where(eq(marks.teacherUserId, profile.userId)).limit(1),
    ]);
    if (timetableRows.length || allocationRows.length || assessmentRows.length || markRows.length) blockedStaff.push(staffProfileId);
  }
  if (blockedLearners.length || blockedStaff.length) throw new Error(`IMPORT_UNDO_BLOCKED:${JSON.stringify({ learners: blockedLearners.length, staff: blockedStaff.length })}`);
  await db.transaction(async tx => {
    if (batch.learnerIds.length) { await tx.delete(learnerGuardians).where(inArray(learnerGuardians.learnerId, batch.learnerIds)); await tx.delete(learners).where(inArray(learners.id, batch.learnerIds)); }
    if (batch.staffProfileIds.length) await tx.delete(staffProfiles).where(inArray(staffProfiles.id, batch.staffProfileIds));
    if (batch.userIds.length) await tx.delete(userPermissions).where(inArray(userPermissions.userId, batch.userIds));
    if (batch.userIds.length) await tx.delete(users).where(inArray(users.id, batch.userIds));
  });
  await db.update(auditLogs).set({ metadata: JSON.stringify({ rows: batch.rows, learnerIds: batch.learnerIds, staffProfileIds: batch.staffProfileIds, userIds: batch.userIds, undoable: false, undoneAt: new Date().toISOString() }) }).where(eq(auditLogs.id, batch.auditId));
  await writeAudit(userId, "people.bulk_import.undo", batch.kind, String(batch.auditId), { rows: batch.rows, learnerIds: batch.learnerIds, staffProfileIds: batch.staffProfileIds, userIds: batch.userIds });
  return { ok: true, kind: batch.kind, rows: batch.rows };
}

export type StaffRole = "admin" | "teacher" | "class_teacher" | "finance";

export async function updateStaffRole(input: { staffProfileId: number; role: StaffRole }, userId: number) {
  const db = await requireDb();
  const current = (await db.select().from(staffProfiles).where(eq(staffProfiles.id, input.staffProfileId)).limit(1))[0];
  if (!current) throw new Error("STAFF_NOT_FOUND");
  await db.update(staffProfiles).set({ role: input.role }).where(eq(staffProfiles.id, input.staffProfileId));
  await writeAudit(userId, "staff.role.update", "staff_profile", input.staffProfileId, { from: current.role, to: input.role });
  return { ok: true, role: input.role };
}

export async function listAcademicCatalog() {
  const db = await requireDb();
  const [allGradeRows, existingSubjects, settings] = await Promise.all([db.select().from(grades).orderBy(grades.name, grades.stream), db.select().from(subjects).orderBy(subjects.name), db.select({ enabledSchoolLevels: schoolSettings.enabledSchoolLevels }).from(schoolSettings).limit(1)]);
  const enabledLevels = new Set((settings[0]?.enabledSchoolLevels || "ECDE,Lower Primary,Upper Primary,Junior School,Senior School").split(",").flatMap(level => level === "Primary" ? ["Lower Primary", "Upper Primary"] : level));
  const existingNames = new Set(existingSubjects.map(subject => subject.name.toLowerCase()));
  const existingCodes = new Set(existingSubjects.map(subject => subject.code.toLowerCase()));
  const missing = Array.from(new Set(curriculumCatalogue().map(row => row.area))).filter(name => !existingNames.has(name.toLowerCase())).map((name, index) => {
    const stem = `CBC-${name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || `AREA-${index + 1}`}`;
    let code = stem; let suffix = 2;
    while (existingCodes.has(code.toLowerCase())) code = `${stem.slice(0, 27 - String(suffix).length)}-${suffix++}`;
    existingCodes.add(code.toLowerCase()); existingNames.add(name.toLowerCase());
    return { name, code };
  });
  if (missing.length) await db.insert(subjects).values(missing);
  const subjectRows = missing.length ? await db.select().from(subjects).orderBy(subjects.name) : existingSubjects;
  const catalogue = curriculumCatalogue();
  const relevantAreas = new Set(catalogue.filter(row => enabledLevels.has(row.level)).map(row => row.area.toLowerCase()));
  const subjectsByLevel = Object.fromEntries(Array.from(enabledLevels).map(level => [level, subjectRows.filter(subject => new Set(catalogue.filter(row => row.level === level).map(row => row.area.toLowerCase())).has(subject.name.toLowerCase()))]));
  const gradeRows = allGradeRows.filter(row => {
    const name = row.name.toLowerCase();
    return (enabledLevels.has("ECDE") && /^(pp|pre-primary)/i.test(name)) || (enabledLevels.has("Lower Primary") && /^grade [1-3]$/i.test(name)) || (enabledLevels.has("Upper Primary") && /^grade [4-6]$/i.test(name)) || (enabledLevels.has("Primary") && /^grade [1-6]$/i.test(name)) || (enabledLevels.has("Junior School") && /^grade [7-9]$/i.test(name)) || (enabledLevels.has("Senior School") && /^grade (10|11|12)$/i.test(name));
  });
  return { grades: gradeRows, subjects: subjectRows.filter(subject => relevantAreas.has(subject.name.toLowerCase())), subjectsByLevel };
}

export async function canManageSchoolLevels(userId: number) {
  const db = await requireDb();
  const profile = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  return profile?.role === "super_admin";
}

export async function createGradeClass(input: { name: string; stream?: string | null }, userId: number) {
  const db = await requireDb();
  const name = input.name.trim();
  const stream = input.stream?.trim() || null;
  const duplicate = (await db.select({ id: grades.id }).from(grades).where(stream
    ? and(eq(grades.name, name), eq(grades.stream, stream))
    : and(eq(grades.name, name), sql`${grades.stream} IS NULL`)).limit(1))[0];
  if (duplicate) throw new Error("GRADE_CLASS_ALREADY_EXISTS");
  await db.insert(grades).values({ name, stream });
  await writeAudit(userId, "grade.create", "grade", name, { name, stream });
  return { ok: true };
}

export async function updateGradeClass(input: { id: number; name: string; stream?: string | null }, userId: number) {
  const db = await requireDb();
  const name = input.name.trim();
  const stream = input.stream?.trim() || null;
  if (!name) throw new Error("GRADE_NAME_REQUIRED");
  const current = (await db.select().from(grades).where(eq(grades.id, input.id)).limit(1))[0];
  if (!current) throw new Error("GRADE_CLASS_NOT_FOUND");
  const duplicates = await db.select({ id: grades.id }).from(grades).where(and(eq(grades.name, name), stream ? eq(grades.stream, stream) : sql`${grades.stream} IS NULL`)).limit(2);
  if (duplicates.some(row => row.id !== input.id)) throw new Error("GRADE_CLASS_ALREADY_EXISTS");
  await db.update(grades).set({ name, stream }).where(eq(grades.id, input.id));
  await writeAudit(userId, "grade.update", "grade", input.id, { from: current, name, stream });
  return { ok: true };
}
export async function deleteGradeClass(id: number, userId: number) {
  const db = await requireDb();
  const current = (await db.select().from(grades).where(eq(grades.id, id)).limit(1))[0];
  if (!current) throw new Error("GRADE_CLASS_NOT_FOUND");
  const [learnerUse, allocationUse, timetableUse, requirementUse] = await Promise.all([
    db.select({ id: learners.id }).from(learners).where(eq(learners.gradeId, id)).limit(1),
    db.select({ id: teacherAllocations.id }).from(teacherAllocations).where(eq(teacherAllocations.gradeId, id)).limit(1),
    db.select({ id: timetableEntries.id }).from(timetableEntries).where(eq(timetableEntries.gradeId, id)).limit(1),
    db.select({ id: timetableRequirements.id }).from(timetableRequirements).where(eq(timetableRequirements.gradeId, id)).limit(1),
  ]);
  if (learnerUse.length || allocationUse.length || timetableUse.length || requirementUse.length) throw new Error("GRADE_CLASS_IN_USE_ARCHIVE_OR_REASSIGN_FIRST");
  await db.delete(grades).where(eq(grades.id, id));
  await writeAudit(userId, "grade.delete", "grade", id, { name: current.name, stream: current.stream });
  return { ok: true };
}
export async function createLearningArea(input: { name: string; code: string }, userId: number) {
  const db = await requireDb();
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const duplicate = (await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.code, code)).limit(1))[0];
  if (duplicate) throw new Error("LEARNING_AREA_CODE_ALREADY_EXISTS");
  await db.insert(subjects).values({ name, code });
  await writeAudit(userId, "learning_area.create", "subject", code, { name, code });
  return { ok: true };
}

export async function listAllocations(filters?: { academicYear?: number; term?: string; status?: "active" | "inactive" | "replaced" }, userId?: number) {
  const db = await requireDb();
  const actor = userId ? (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0] : null;
  const where = filters?.academicYear || filters?.term || filters?.status || actor?.role === "user" ? and(filters?.academicYear ? eq(teacherAllocations.academicYear, filters.academicYear) : undefined, filters?.term ? eq(teacherAllocations.term, filters.term) : undefined, filters?.status ? eq(teacherAllocations.status, filters.status) : undefined, actor?.role === "user" && userId ? eq(teacherAllocations.teacherUserId, userId) : undefined) : undefined;
  return db.select({ allocation: teacherAllocations, staff: staffProfiles, grade: grades, subject: subjects }).from(teacherAllocations).leftJoin(staffProfiles, eq(staffProfiles.userId, teacherAllocations.teacherUserId)).leftJoin(grades, eq(grades.id, teacherAllocations.gradeId)).leftJoin(subjects, eq(subjects.id, teacherAllocations.subjectId)).where(where).orderBy(desc(teacherAllocations.id));
}

export type AllocationType = "class_teacher" | "learning_area" | "co_teacher" | "substitute" | "activity";
export type AllocationStatus = "active" | "inactive" | "replaced";

export function allocationContextConflict(input: { gradeId: number; subjectId: number; allocationType: AllocationType; startsOn?: string | null; endsOn?: string | null }, existing: { gradeId: number; subjectId: number; allocationType: AllocationType; status: AllocationStatus; startsOn: string | Date | null; endsOn: string | Date | null }) {
  if (existing.status !== "active" || existing.gradeId !== input.gradeId) return false;
  if (input.allocationType === "class_teacher") return existing.allocationType === "class_teacher";
  if (existing.allocationType === "class_teacher" || existing.subjectId !== input.subjectId) return false;
  // A subject belongs to one teacher per grade, academic year and term.
  // Date fields describe the assignment period; they must not create a second
  // active owner for the same subject when an administrator enters different dates.
  return true;
}

export async function saveTeacherAllocation(input: { teacherUserId: number; gradeId: number; subjectId: number; academicYear: number; term: string; allocationType: AllocationType; startsOn?: string | null; endsOn?: string | null }, userId: number) {
  const db = await requireDb();
  if (input.term.trim().length < 2) throw new Error("TERM_REQUIRED");
  if (input.allocationType !== "class_teacher" && input.subjectId <= 0) throw new Error("LEARNING_AREA_REQUIRED");
  if (input.startsOn && input.endsOn && input.startsOn > input.endsOn) throw new Error("INVALID_DATE_RANGE");
  const teacher = (await db.select().from(users).where(eq(users.id, input.teacherUserId)).limit(1))[0];
  const grade = (await db.select().from(grades).where(eq(grades.id, input.gradeId)).limit(1))[0];
  if (!teacher || !grade) throw new Error("ALLOCATION_CONTEXT_NOT_FOUND");
  const active = await db.select().from(teacherAllocations).where(and(eq(teacherAllocations.gradeId, input.gradeId), eq(teacherAllocations.academicYear, input.academicYear), eq(teacherAllocations.term, input.term), eq(teacherAllocations.status, "active")));
  const conflict = active.find(row => allocationContextConflict(input, row));
  if (conflict && conflict.teacherUserId !== input.teacherUserId) {
    if (input.allocationType === "class_teacher") throw new Error("CLASS_TEACHER_CONFLICT");
    throw new Error(`subject already allocated. Delete existing allocation first. [allocationId:${conflict.id}]`);
  }
  const existing = (await db.select().from(teacherAllocations).where(and(eq(teacherAllocations.teacherUserId, input.teacherUserId), eq(teacherAllocations.gradeId, input.gradeId), eq(teacherAllocations.subjectId, input.subjectId), eq(teacherAllocations.academicYear, input.academicYear), eq(teacherAllocations.term, input.term), eq(teacherAllocations.allocationType, input.allocationType))).limit(1))[0];
  const values = { ...input, startsOn: input.startsOn ? new Date(input.startsOn) : null, endsOn: input.endsOn ? new Date(input.endsOn) : null, status: "active" as const };
  if (existing) await db.update(teacherAllocations).set(values).where(eq(teacherAllocations.id, existing.id));
  else await db.insert(teacherAllocations).values(values);
  await writeAudit(userId, existing ? "allocation.update" : "allocation.create", "teacher_allocation", existing?.id ?? null, input);
  return { ok: true, id: existing?.id ?? null };
}

export async function assignClassTeacher(input: { teacherUserId: number; gradeId: number; academicYear: number; term: string }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const teacher = (await db.select({ userId: staffProfiles.userId, role: staffProfiles.role, status: staffProfiles.status, schoolId: staffProfiles.schoolId }).from(staffProfiles).where(eq(staffProfiles.userId, input.teacherUserId)).limit(1))[0];
  const grade = (await db.select().from(grades).where(eq(grades.id, input.gradeId)).limit(1))[0];
  if (!teacher || !grade || (schoolId != null && (teacher.schoolId !== schoolId || grade.schoolId !== schoolId))) throw new Error("ALLOCATION_CONTEXT_NOT_FOUND");
  if (teacher.status !== "active") throw new Error("ACTIVE_TEACHER_REQUIRED");
  const previousHolder = grade.classTeacherUserId && grade.classTeacherUserId !== input.teacherUserId ? grade.classTeacherUserId : null;
  await db.transaction(async tx => {
    // A teacher may be responsible for one class at a time. Selecting them here moves the assignment cleanly.
    const otherGrades = await tx.select({ id: grades.id }).from(grades).where(and(eq(grades.classTeacherUserId, input.teacherUserId), ne(grades.id, input.gradeId), schoolId == null ? undefined : eq(grades.schoolId, schoolId)));
    for (const other of otherGrades) {
      await tx.update(grades).set({ classTeacherUserId: null }).where(eq(grades.id, other.id));
      await tx.update(teacherAllocations).set({ status: "inactive" }).where(and(eq(teacherAllocations.gradeId, other.id), eq(teacherAllocations.teacherUserId, input.teacherUserId), eq(teacherAllocations.allocationType, "class_teacher"), eq(teacherAllocations.status, "active")));
    }
    await tx.update(teacherAllocations).set({ status: "inactive", replacedByUserId: input.teacherUserId }).where(and(eq(teacherAllocations.gradeId, input.gradeId), eq(teacherAllocations.academicYear, input.academicYear), eq(teacherAllocations.term, input.term), eq(teacherAllocations.allocationType, "class_teacher"), eq(teacherAllocations.status, "active")));
    const existing = (await tx.select({ id: teacherAllocations.id }).from(teacherAllocations).where(and(eq(teacherAllocations.teacherUserId, input.teacherUserId), eq(teacherAllocations.gradeId, input.gradeId), eq(teacherAllocations.academicYear, input.academicYear), eq(teacherAllocations.term, input.term), eq(teacherAllocations.allocationType, "class_teacher"))).limit(1))[0];
    if (existing) await tx.update(teacherAllocations).set({ status: "active", replacedByUserId: null, schoolId }).where(eq(teacherAllocations.id, existing.id));
    else await tx.insert(teacherAllocations).values({ schoolId, teacherUserId: input.teacherUserId, gradeId: input.gradeId, subjectId: 0, academicYear: input.academicYear, term: input.term, allocationType: "class_teacher", status: "active" });
    await tx.update(grades).set({ classTeacherUserId: input.teacherUserId }).where(and(eq(grades.id, input.gradeId), schoolId == null ? undefined : eq(grades.schoolId, schoolId)));
    await tx.update(staffProfiles).set({ role: "class_teacher" }).where(and(eq(staffProfiles.userId, input.teacherUserId), schoolId == null ? undefined : eq(staffProfiles.schoolId, schoolId)));
  });
  await writeAudit(userId, previousHolder ? "class_teacher.replace" : "class_teacher.assign", "grade", input.gradeId, { ...input, previousHolder });
  return { ok: true, gradeId: input.gradeId, teacherUserId: input.teacherUserId, replacedTeacherUserId: previousHolder };
}

export async function changeTeacherAllocationStatus(input: { allocationId: number; status: AllocationStatus | "active"; replacedByUserId?: number | null }, userId: number) {
  const db = await requireDb();
  const current = (await db.select().from(teacherAllocations).where(eq(teacherAllocations.id, input.allocationId)).limit(1))[0];
  if (!current) throw new Error("ALLOCATION_NOT_FOUND");
  if (input.status === "replaced" && !input.replacedByUserId) throw new Error("REPLACEMENT_TEACHER_REQUIRED");
  await db.update(teacherAllocations).set({ status: input.status, replacedByUserId: input.replacedByUserId ?? null }).where(eq(teacherAllocations.id, input.allocationId));
  await writeAudit(userId, `allocation.${input.status}`, "teacher_allocation", input.allocationId, input);
  return { ok: true };
}
export async function deleteTeacherAllocation(id: number, userId: number) {
  const db = await requireDb();
  const current = (await db.select().from(teacherAllocations).where(eq(teacherAllocations.id, id)).limit(1))[0];
  if (!current) throw new Error("ALLOCATION_NOT_FOUND");
  await db.delete(teacherAllocations).where(eq(teacherAllocations.id, id));
  await writeAudit(userId, "allocation.delete", "teacher_allocation", id, { teacherUserId: current.teacherUserId, gradeId: current.gradeId, subjectId: current.subjectId });
  return { ok: true };
}

export async function saveSettings(input: { schoolName: string; motto?: string | null; currentTerm: string; academicYear: number; includeFeesOnReportCard: boolean; showPercentagesOnReportCard?: boolean; subjectShortNames?: Record<string, string> }, userId: number) {
  const db = await requireDb();
  const current = (await db.select().from(schoolSettings).limit(1))[0];
  const { subjectShortNames, ...profileInput } = input; const values = { ...profileInput, includeFeesOnReportCard: input.includeFeesOnReportCard ? 1 : 0, showPercentagesOnReportCard: input.showPercentagesOnReportCard ? 1 : 0, subjectShortNames: JSON.stringify(subjectShortNames ?? {}) };
  if (current) await db.update(schoolSettings).set(values).where(eq(schoolSettings.id, current.id));
  else await db.insert(schoolSettings).values(values);
  await writeAudit(userId, "settings.update", "school_settings", current?.id ?? null, values);
  return getSettings();
}

export async function listAuditLogs() {
  const db = await requireDb();
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
}

export async function getReportCard(learnerId: number) {
  const db = await requireDb();
  const learnerRow = (await db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(eq(learners.id, learnerId)).limit(1))[0];
  if (!learnerRow) throw new Error("LEARNER_NOT_FOUND");
  const markRows = await db.select({ mark: marks, subject: subjects, assessment: assessments }).from(marks).innerJoin(subjects, eq(subjects.id, marks.subjectId)).innerJoin(assessments, eq(assessments.id, marks.assessmentId)).where(eq(marks.learnerId, learnerId));
  const finance = await getFinanceOverview(learnerId);
  return { learner: learnerRow.learner, grade: learnerRow.grade, marks: markRows, finance: finance.balances[0] ?? null, settings: await getSettings() };
}
