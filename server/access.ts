import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { grades, rolePermissions, staffProfiles, teacherAllocations, userPermissions, userRoles, users } from "../drizzle/schema";

/** Modules and actions of the NEXUS permission matrix. Keys are `${module}.${action}`. */
export const MODULES = [
  ["dashboard", "Dashboard"], ["learners", "Learners"], ["attendance", "Attendance"], ["assessments", "Assessments"],
  ["marklists", "Marklists"], ["report_cards", "Report Cards"], ["finance", "Finance & Resources"], ["store", "Store"],
  ["timetable", "Timetable"], ["allocations", "Teacher Allocations"], ["administration", "Administration"],
  ["communication", "Communications"], ["alumni", "Alumni"], ["archives", "Academic Archives & Alumni"], ["counselling", "Guidance & Counselling"], ["library", "Library"], ["health", "Health & Medical"], ["boarding", "Boarding Management"], ["ai", "NEXUS AI"], ["reports", "Reports"], ["settings", "Settings"],
] as const;
export const ACTIONS = ["view", "create", "edit", "delete", "approve", "export"] as const;
export const MANAGE_PERMISSIONS = "administration.manage_permissions";
export const MATRIX_KEYS: string[] = [...MODULES.flatMap(([module]) => ACTIONS.map(action => `${module}.${action}`)), MANAGE_PERMISSIONS];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrator", admin: "Administrator", head_teacher: "Head of Department", deputy_head: "Deputy",
  teacher: "Teacher", senior_teacher: "Senior Teacher", class_teacher: "Class Teacher", exam_council: "Exam Council", nurse: "Nurse", boarding_master: "Boarding Master", finance: "Accounts Officer", storekeeper: "Support Staff", other: "Support Staff",
};
/** Roles offered when creating or changing a user (stored in staff_profiles.role). */
export const ASSIGNABLE_ROLES = ["super_admin", "admin", "teacher", "senior_teacher", "class_teacher", "deputy_head", "head_teacher", "exam_council", "nurse", "boarding_master", "finance", "other"] as const;
export type StaffRole = "super_admin" | "admin" | "teacher" | "class_teacher" | "exam_council" | "nurse" | "boarding_master" | "senior_teacher" | "deputy_head" | "head_teacher" | "finance" | "storekeeper" | "other";

/** Collapses legacy staff roles to the permission role that carries their defaults. */
export function permissionRole(role: string) {
  return ({ head_teacher: "admin", deputy_head: "admin", senior_teacher: "teacher", storekeeper: "other" } as Record<string, string>)[role] ?? role;
}

/** Matrix key -> keys used by the pre-existing route guards, so one matrix governs the whole system. */
const LEGACY: Record<string, string[]> = {
  "learners.create": ["learners.add"], "learners.delete": ["learners.deactivate"],
  "attendance.create": ["attendance.edit"],
  "assessments.create": ["assessments.edit"], "assessments.edit": ["assessments.edit"],
  "report_cards.view": ["reports.view"],
  "finance.create": ["finance.edit"], "finance.edit": ["finance.edit"],
  "timetable.create": ["timetable.edit"], "timetable.edit": ["timetable.edit"],
  "allocations.edit": ["allocations.edit", "allocations.replace", "allocations.bulk"], "allocations.delete": ["allocations.deactivate"],
  "administration.create": ["users.edit"], "administration.edit": ["users.edit"], "ai.view": ["ai.access"],
};
export const expand = (key: string) => Array.from(new Set([key, ...(LEGACY[key] ?? [])]));

async function requireDb() { const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE"); return db; }

/** Accounts without a staff identity never inherit administrative privileges. */
export async function resolveRole(userId: number, _accountRole: string) {
  const db = await requireDb();
  const profile = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  return (profile?.role ?? "other") as StaffRole;
}

/** Only explicit allowed rows from the persistent policy table grant role permissions. */
export async function roleMatrix(role: string) {
  const db = await requireDb();
  const rows = await db.select().from(rolePermissions).where(eq(rolePermissions.role, permissionRole(role)));
  return new Set(rows.filter(row => Number(row.allowed) === 1).map(row => row.permissionKey));
}

/** Persistent role grants plus per-user overrides; absent grants fail closed. */
export async function computePermissions(userId: number, accountRole: string) {
  const db = await requireDb();
  const legacyRole = await resolveRole(userId, accountRole);
  const assigned = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId));
  const roles = Array.from(new Set([legacyRole, ...assigned.map(row => row.role)]));
  const matrices = await Promise.all(roles.map(role => roleMatrix(role)));
  if (matrices.some(matrix => matrix.has("*"))) return ["*"];
  const result = new Set<string>();
  for (const matrix of matrices) for (const key of Array.from(matrix)) expand(key).forEach(k => result.add(k));
  for (const o of await db.select().from(userPermissions).where(eq(userPermissions.userId, userId))) {
    for (const k of expand(o.permissionKey)) o.allowed ? result.add(k) : result.delete(k);
  }
  // Attendance is role-bound: Teachers are view-only; the other selectable
  // staff roles can capture attendance regardless of stale per-user grants.
  if (roles.includes("teacher") && !roles.some(role => ["admin", "class_teacher", "finance"].includes(permissionRole(role)))) result.delete("attendance.edit");
  if (roles.some(role => ["admin", "class_teacher", "finance"].includes(permissionRole(role)))) {
    result.add("attendance.view");
    result.add("attendance.edit");
  }
  return Array.from(result);
}

export async function can(userId: number, accountRole: string, permission: string) {
  const perms = await computePermissions(userId, accountRole);
  return perms.includes("*") || perms.includes(permission);
}

export async function assignedRoles(userId: number): Promise<string[]> {
  const db = await requireDb();
  const account = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const legacy = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0]?.role ?? "other";
  const additional = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId));
  return Array.from(new Set([legacy, account?.role === "admin" ? "admin" : null, ...additional.map(row => row.role)].filter((role): role is string => Boolean(role))));
}

export async function canCreateAssessments(userId: number): Promise<boolean> {
  const roles = await assignedRoles(userId);
  return rolesCanCreateAssessments(roles);
}

export async function canViewWholeClassMarklist(userId: number, accountRole: string): Promise<boolean> {
  const roles = await assignedRoles(userId);
  void accountRole;
  return rolesCanViewWholeClassMarklist(roles);
}

export function rolesCanCreateAssessments(roles: string[]) {
  return roles.some(role => ["admin", "super_admin", "head_teacher", "deputy_head"].includes(role));
}

export function rolesCanViewWholeClassMarklist(roles: string[]) {
  return roles.some(role => ["admin", "super_admin", "head_teacher", "deputy_head", "exam_council"].includes(role));
}

export type AccessProfile = { userId: number; role: StaffRole; label: string; level: "system" | "school" | "class" | "allocated"; gradeIds: number[]; pairs: string[] };

/** Scope boundary: which grades and grade:subject pairs the user may touch. Enforced server-side by data functions. */
export async function getAccessProfile(userId: number): Promise<AccessProfile> {
  const db = await requireDb();
  const account = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const role = await resolveRole(userId, account?.role ?? "user");
  const pr = permissionRole(role);
  const manager = (await roleMatrix(role)).has(MANAGE_PERMISSIONS);
  const level = manager ? "system" : pr === "admin" || pr === "finance" ? "school" : pr === "teacher" ? "allocated" : pr === "class_teacher" ? "class" : "allocated";
  if (level === "system" || level === "school") return { userId, role, label: ROLE_LABELS[role], level, gradeIds: [], pairs: [] };
  const allocations = await db.select().from(teacherAllocations).where(and(eq(teacherAllocations.teacherUserId, userId), eq(teacherAllocations.status, "active")));
  const ownedClasses = await db.select({ id: grades.id }).from(grades).where(eq(grades.classTeacherUserId, userId));
  const classGrades = new Set([...allocations.filter(a => a.allocationType === "class_teacher").map(a => a.gradeId), ...ownedClasses.map(g => g.id)]);
  const taught = allocations.filter(a => a.allocationType !== "class_teacher" && a.subjectId > 0);
  const gradeIds = Array.from(new Set(level === "class" ? Array.from(classGrades) : allocations.map(a => a.gradeId)));
  return { userId, role, label: ROLE_LABELS[role], level, gradeIds, pairs: taught.map(a => `${a.gradeId}:${a.subjectId}`) };
}
export const isScoped = (p: AccessProfile) => p.level === "class" || p.level === "allocated";
