import { and, desc, eq, like, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  alumni,
  assessments,
  attendances,
  auditLogs,
  communications,
  expenditures,
  guardians,
  learnerGuardians,
  feeStructures,
  grades,
  learners,
  marks,
  payments,
  permissions,
  schoolSettings,
  staffProfiles,
  storeItems,
  storeMovements,
  subjects,
  teacherAllocations,
  timetableEntries,
  userPermissions,
  users,
} from "../drizzle/schema";

export const permissionsByRole: Record<string, string[]> = {
  super_admin: ["*"],
  admin: ["dashboard.view", "learners.view", "attendance.view", "attendance.edit", "assessments.view", "assessments.edit", "reports.view", "finance.view", "finance.edit", "store.view", "store.edit", "timetable.view", "timetable.edit", "communication.edit", "alumni.edit", "users.edit", "settings.edit", "audit.view"],
  teacher: ["dashboard.view", "learners.view", "attendance.view", "attendance.edit", "assessments.view", "assessments.edit", "reports.view", "timetable.view"],
  finance: ["dashboard.view", "learners.view", "finance.view", "finance.edit", "reports.view"],
  storekeeper: ["dashboard.view", "store.view", "store.edit", "reports.view"],
  other: ["dashboard.view"],
};

export const permissionCatalog = [
  ["learners.view", "View learners"], ["learners.add", "Add learners"], ["learners.edit", "Edit learners"], ["learners.deactivate", "Deactivate learners"],
  ["attendance.view", "View attendance"], ["attendance.edit", "Enter and edit attendance"], ["assessments.view", "View marks"], ["assessments.edit", "Enter and edit marks"],
  ["reports.view", "View reports"], ["finance.view", "View finance"], ["finance.edit", "Record payments and expenditure"], ["store.view", "View inventory"], ["store.edit", "Manage inventory"],
  ["timetable.view", "View timetable"], ["timetable.edit", "Edit timetable"], ["communication.edit", "Manage communication"], ["alumni.edit", "Manage alumni"], ["users.edit", "Manage users"], ["settings.edit", "Manage settings"], ["ai.access", "Access NEXUS AI"], ["audit.view", "View audit logs"],
] as const;

export async function effectivePermissions(userId: number, role: string) {
  const db = await requireDb();
  const base = permissionsByRole[role] ?? [];
  const overrides = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
  const values = new Set(base);
  for (const override of overrides) {
    if (override.allowed) values.add(override.permissionKey);
    else values.delete(override.permissionKey);
  }
  return Array.from(values);
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

export async function writeAudit(userId: number | null, action: string, entityType: string, entityId?: string | number | null, metadata: Record<string, unknown> = {}) {
  const db = await requireDb();
  await db.insert(auditLogs).values({
    userId,
    action,
    entityType,
    entityId: entityId == null ? null : String(entityId),
    metadata: JSON.stringify(metadata),
  });
}

export async function getSettings() {
  const db = await requireDb();
  const row = (await db.select().from(schoolSettings).limit(1))[0];
  return row ?? { id: 0, schoolName: "Ebunangwe Junior School", motto: "Learn. Lead. Serve.", currentTerm: "Term 2", academicYear: 2026, includeFeesOnReportCard: 1, logoPath: null, principalSignaturePath: null, classTeacherSignaturePath: null };
}

export async function getDashboardSnapshot() {
  const db = await requireDb();
  const [settings, learnerRows, attendanceRows, paymentRows, assessmentRows, staffRows, lowStockRows] = await Promise.all([
    getSettings(),
    db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(eq(learners.status, "active")),
    db.select().from(attendances).orderBy(desc(attendances.id)).limit(100),
    db.select().from(payments).orderBy(desc(payments.paidAt)).limit(100),
    db.select().from(assessments).where(sql`${assessments.status} <> 'approved'`),
    db.select().from(staffProfiles).where(eq(staffProfiles.status, "active")),
    db.select({ item: storeItems, movement: storeMovements }).from(storeItems).leftJoin(storeMovements, eq(storeItems.id, storeMovements.itemId)),
  ]);
  const attendanceToday = attendanceRows.filter(row => String(row.attendanceDate) === new Date().toISOString().slice(0, 10));
  const present = attendanceToday.filter(row => row.status === "present").length;
  const attendanceRate = attendanceToday.length ? Math.round((present / attendanceToday.length) * 1000) / 10 : 0;
  const collections = paymentRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const stock = new Map<number, { name: string; unit: string; quantity: number; reorderLevel: number }>();
  for (const row of lowStockRows) {
    if (!row.item) continue;
    const current = stock.get(row.item.id) ?? { name: row.item.name, unit: row.item.unit, quantity: 0, reorderLevel: Number(row.item.reorderLevel) };
    if (row.movement) current.quantity += row.movement.movementType === "issued" ? -Number(row.movement.quantity) : Number(row.movement.quantity);
    stock.set(row.item.id, current);
  }
  return {
    school: settings,
    counts: { learners: learnerRows.length, staff: staffRows.length, assessmentsPending: assessmentRows.length, collections },
    attendance: { today: attendanceToday.length, present, rate: attendanceRate },
    lowStock: Array.from(stock.values()).filter(item => item.quantity <= item.reorderLevel),
    recentLearners: learnerRows.slice(0, 8).map(row => ({ ...row.learner, grade: row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "" })),
  };
}

export async function listLearners(search?: string) {
  const db = await requireDb();
  const rows = await db.select({ learner: learners, grade: grades }).from(learners).leftJoin(grades, eq(grades.id, learners.gradeId)).where(search ? like(learners.fullName, `%${search}%`) : undefined).orderBy(learners.fullName);
  return rows.map(row => ({ ...row.learner, grade: row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "" }));
}

export async function listAttendance(date?: string) {
  const db = await requireDb();
  const rows = await db.select({ attendance: attendances, learner: learners, grade: grades }).from(attendances).innerJoin(learners, eq(learners.id, attendances.learnerId)).leftJoin(grades, eq(grades.id, attendances.gradeId)).where(date ? eq(attendances.attendanceDate, new Date(date)) : undefined).orderBy(desc(attendances.id));
  return rows.map(row => ({ ...row.attendance, learner: row.learner, grade: row.grade }));
}

export async function saveAttendance(input: { learnerId: number; status: "present" | "absent" | "late" | "excused"; attendanceDate: string; note?: string | null }, userId: number) {
  const db = await requireDb();
  const learner = (await db.select().from(learners).where(eq(learners.id, input.learnerId)).limit(1))[0];
  if (!learner) throw new Error("LEARNER_NOT_FOUND");
  await db.insert(attendances).values({ learnerId: input.learnerId, status: input.status, attendanceDate: new Date(input.attendanceDate), note: input.note ?? null, gradeId: learner.gradeId }).onDuplicateKeyUpdate({ set: { status: input.status, note: input.note ?? null } });
  await writeAudit(userId, "attendance.save", "learner", learner.id, input);
  return { ok: true };
}

export async function listAssessments() {
  const db = await requireDb();
  return db.select({ assessment: assessments, grade: grades }).from(assessments).leftJoin(grades, eq(grades.id, assessments.gradeId)).orderBy(desc(assessments.id));
}

export async function listMarks(assessmentId?: number) {
  const db = await requireDb();
  const rows = await db.select({ mark: marks, learner: learners, subject: subjects }).from(marks).innerJoin(learners, eq(learners.id, marks.learnerId)).innerJoin(subjects, eq(subjects.id, marks.subjectId)).where(assessmentId ? eq(marks.assessmentId, assessmentId) : undefined).orderBy(learners.fullName);
  return rows.map(row => ({ ...row.mark, learner: row.learner, subject: row.subject }));
}

export async function saveMark(input: { assessmentId: number; learnerId: number; subjectId: number; midTerm: number; endTerm: number; teacherRemark?: string | null }, userId: number) {
  const db = await requireDb();
  const midTerm = assertScore(input.midTerm);
  const endTerm = assertScore(input.endTerm);
  const average = Math.round(((midTerm + endTerm) / 2) * 100) / 100;
  const values = { ...input, midTerm: String(midTerm), endTerm: String(endTerm), average: String(average), cbcLevel: cbcLevel(average) as "EE1" | "EE2" | "ME1" | "ME2" | "AE1" | "AE2" | "BE1" | "BE2" };
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
  return db.select({ entry: timetableEntries, grade: grades, subject: subjects, teacher: users }).from(timetableEntries).leftJoin(grades, eq(grades.id, timetableEntries.gradeId)).leftJoin(subjects, eq(subjects.id, timetableEntries.subjectId)).leftJoin(users, eq(users.id, timetableEntries.teacherUserId)).orderBy(timetableEntries.dayOfWeek, timetableEntries.period);
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

export async function generateTimetable(entries: Array<{ dayOfWeek: number; period: number; gradeId: number; subjectId: number; teacherUserId: number; room?: string | null }>, userId: number) {
  const conflicts = timetableConflicts(entries);
  if (conflicts.length) throw new Error(`TIMETABLE_CLASH:${conflicts.join(",")}`);
  const db = await requireDb();
  if (entries.length) await db.insert(timetableEntries).values(entries);
  await writeAudit(userId, "timetable.generate", "timetable", null, { count: entries.length });
  return { placed: entries.length, conflicts: [] };
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

export async function listAlumni() {
  const db = await requireDb();
  return db.select({ alumni: alumni, learner: learners }).from(alumni).innerJoin(learners, eq(learners.id, alumni.learnerId)).orderBy(desc(alumni.completionYear));
}

export async function archiveLearner(input: { learnerId: number; completionYear: number; destination?: string | null }, userId: number) {
  const db = await requireDb();
  await db.insert(alumni).values({ ...input, archivedByUserId: userId });
  await db.update(learners).set({ status: "archived" }).where(eq(learners.id, input.learnerId));
  await writeAudit(userId, "alumni.archive", "learner", input.learnerId, input);
  return { ok: true };
}

export async function listStaff() {
  const db = await requireDb();
  return db.select({ profile: staffProfiles, user: users }).from(staffProfiles).leftJoin(users, eq(users.id, staffProfiles.userId)).orderBy(staffProfiles.displayName);
}

export async function listAllocations() {
  const db = await requireDb();
  return db.select({ allocation: teacherAllocations, staff: staffProfiles, grade: grades, subject: subjects }).from(teacherAllocations).leftJoin(staffProfiles, eq(staffProfiles.userId, teacherAllocations.teacherUserId)).leftJoin(grades, eq(grades.id, teacherAllocations.gradeId)).leftJoin(subjects, eq(subjects.id, teacherAllocations.subjectId));
}

export async function saveSettings(input: { schoolName: string; motto?: string | null; currentTerm: string; academicYear: number; includeFeesOnReportCard: boolean }, userId: number) {
  const db = await requireDb();
  const current = (await db.select().from(schoolSettings).limit(1))[0];
  const values = { ...input, includeFeesOnReportCard: input.includeFeesOnReportCard ? 1 : 0 };
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
