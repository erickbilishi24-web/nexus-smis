import { and, eq, gte, lte, or } from "drizzle-orm";
import { schoolSettings, staffClockings, staffProfiles, users } from "../drizzle/schema";
import { getDb } from "./db";
import { actorSchoolId, userCan, writeAudit } from "./smis";

async function requireDb() { const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE"); return db; }
const today = () => new Date().toISOString().slice(0, 10);
const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const radians = (v: number) => v * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

async function assertManager(userId: number, authRole: string) {
  const db = await requireDb();
  const profile = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  if (authRole !== "admin" && !["super_admin", "admin", "head_teacher", "deputy_head"].includes(profile?.role ?? "")) throw new Error("SCHOOL_LOCATION_ADMIN_ONLY");
  if (!await userCan(userId, authRole, "settings.edit")) throw new Error("SCHOOL_LOCATION_PERMISSION_REQUIRED");
}

export async function getClockingSetup(userId: number) {
  const db = await requireDb();
  const settings = (await db.select({ latitude: schoolSettings.latitude, longitude: schoolSettings.longitude, radius: schoolSettings.geofenceRadiusMeters }).from(schoolSettings).limit(1))[0];
  const existing = (await db.select().from(staffClockings).where(and(eq(staffClockings.userId, userId), eq(staffClockings.clockDate, new Date(`${today()}T00:00:00Z`)))).limit(1))[0];
  return { configured: settings?.latitude != null && settings.longitude != null, latitude: settings?.latitude ?? null, longitude: settings?.longitude ?? null, radiusMeters: settings?.radius ?? 150, clockedIn: !!existing, clockedOut: !!existing?.clockedOutAt, clocking: existing ?? null, date: today() };
}

export async function saveSchoolLocation(input: { latitude: number; longitude: number; radiusMeters: number }, userId: number, authRole: string) {
  await assertManager(userId, authRole);
  const db = await requireDb();
  const current = (await db.select({ id: schoolSettings.id }).from(schoolSettings).limit(1))[0];
  if (current) await db.update(schoolSettings).set({ latitude: input.latitude.toFixed(7), longitude: input.longitude.toFixed(7), geofenceRadiusMeters: input.radiusMeters }).where(eq(schoolSettings.id, current.id));
  else await db.insert(schoolSettings).values({ schoolName: "Ebunangwe Junior School", currentTerm: "Term 2", academicYear: new Date().getUTCFullYear(), latitude: input.latitude.toFixed(7), longitude: input.longitude.toFixed(7), geofenceRadiusMeters: input.radiusMeters });
  await writeAudit(userId, "settings.school_location.update", "school_settings", current?.id ?? null, input);
  return getClockingSetup(userId);
}

export async function clockIn(input: { latitude: number; longitude: number }, userId: number) {
  const db = await requireDb();
  const settings = (await db.select({ latitude: schoolSettings.latitude, longitude: schoolSettings.longitude, radius: schoolSettings.geofenceRadiusMeters }).from(schoolSettings).limit(1))[0];
  if (!settings?.latitude || !settings.longitude) throw new Error("SCHOOL_LOCATION_NOT_CONFIGURED");
  const existing = (await db.select().from(staffClockings).where(and(eq(staffClockings.userId, userId), eq(staffClockings.clockDate, new Date(`${today()}T00:00:00Z`)))).limit(1))[0];
  if (existing) return { ok: true, alreadyClockedIn: true, distanceMeters: Number(existing.distanceMeters), clocking: existing };
  const meters = distance(input.latitude, input.longitude, Number(settings.latitude), Number(settings.longitude));
  if (meters > Number(settings.radius ?? 150)) throw new Error(`OUTSIDE_SCHOOL_GEOFENCE:${Math.round(meters)}:${settings.radius ?? 150}`);
  const inserted = (await db.insert(staffClockings).values({ userId, clockDate: new Date(`${today()}T00:00:00Z`), latitude: input.latitude.toFixed(7), longitude: input.longitude.toFixed(7), distanceMeters: meters.toFixed(2) }).$returningId())[0];
  await writeAudit(userId, "staff.clock_in", "staff_clocking", inserted.id, { date: today(), distanceMeters: Math.round(meters) });
  return { ok: true, alreadyClockedIn: false, distanceMeters: Math.round(meters), clocking: (await db.select().from(staffClockings).where(eq(staffClockings.id, inserted.id)).limit(1))[0] };
}

export async function clockOut(userId: number) {
  const db = await requireDb();
  const existing = (await db.select().from(staffClockings).where(and(eq(staffClockings.userId, userId), eq(staffClockings.clockDate, new Date(`${today()}T00:00:00Z`)))).limit(1))[0];
  if (!existing) throw new Error("CLOCK_IN_REQUIRED");
  if (existing.clockedOutAt) return { ok: true, alreadyClockedOut: true, clocking: existing };
  await db.update(staffClockings).set({ clockedOutAt: new Date() }).where(eq(staffClockings.id, existing.id));
  await writeAudit(userId, "staff.clock_out", "staff_clocking", existing.id, { date: today() });
  return { ok: true, alreadyClockedOut: false, clocking: (await db.select().from(staffClockings).where(eq(staffClockings.id, existing.id)).limit(1))[0] };
}

export type TeacherAttendancePeriod = "daily" | "weekly" | "monthly" | "yearly";
function attendanceRange(period: TeacherAttendancePeriod, anchorDate: string) {
  const d = new Date(`${anchorDate}T00:00:00Z`);
  if (period === "daily") return { start: d, end: d };
  if (period === "weekly") { const day = d.getUTCDay() || 7; const start = new Date(d); start.setUTCDate(d.getUTCDate() - day + 1); const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6); return { start, end }; }
  if (period === "monthly") return { start: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)) };
  return { start: new Date(Date.UTC(d.getUTCFullYear(), 0, 1)), end: new Date(Date.UTC(d.getUTCFullYear(), 11, 31)) };
}

export async function listTeacherAttendance(input: { period: TeacherAttendancePeriod; anchorDate: string }, userId: number) {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const { start, end } = attendanceRange(input.period, input.anchorDate);
  const rows = await db.select({ clocking: staffClockings, profile: staffProfiles, userName: users.name, username: users.username })
    .from(staffClockings)
    .innerJoin(users, eq(users.id, staffClockings.userId))
    .leftJoin(staffProfiles, and(eq(staffProfiles.userId, staffClockings.userId), eq(staffProfiles.schoolId, schoolId)))
    .where(and(or(eq(staffClockings.schoolId, schoolId), eq(users.schoolId, schoolId)), gte(staffClockings.clockDate, start), lte(staffClockings.clockDate, end)))
    .orderBy(staffClockings.clockDate, staffProfiles.displayName);
  return { period: input.period, anchorDate: input.anchorDate, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), rows: rows.map(row => ({ ...row.clocking, teacherName: row.profile?.displayName ?? row.userName ?? row.username ?? `User #${row.clocking.userId}`, role: row.profile?.role ?? "staff" })) };
}
