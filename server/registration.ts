import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, or } from "drizzle-orm";
import type { Request } from "express";
import { getDb } from "./db";
import { auditLogs, schoolMemberships, schoolRegistrations, schoolSettings, schoolSubscriptions, schools, staffProfiles, users } from "../drizzle/schema";

export class RegistrationError extends Error {}
const fail = (code: string): never => { throw new RegistrationError(code); };
async function requireDb() { const db = await getDb(); if (!db) throw new RegistrationError("DATABASE_UNAVAILABLE"); return db; }
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const normalize = (value: string) => value.trim().toLowerCase();
const codePart = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SCHOOL";
async function uniqueSchoolCode(db: any, name: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = `${codePart(name)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const found = (await db.select({ id: schools.id }).from(schools).where(eq(schools.schoolCode, code)).limit(1))[0];
    if (!found) return code;
  }
  throw new RegistrationError("SCHOOL_CODE_GENERATION_FAILED");
}
function addDays(date: Date, days: number) { return new Date(date.getTime() + days * 86400000); }

export async function registerSchool(input: { schoolName: string; schoolType: string; county: string; subcounty?: string | null; contactPhone: string; officialEmail?: string | null; registrationIdentifier?: string | null; headInstitutionName: string; adminFullName: string; adminEmail?: string | null; adminPhone?: string | null; preferredUsername: string }, req?: Request) {
  const db = await requireDb();
  const schoolName = input.schoolName.trim();
  const contactPhone = input.contactPhone.trim();
  const preferredUsername = normalize(input.preferredUsername);
  const registrationIdentifier = input.registrationIdentifier?.trim() || null;
  const officialEmail = input.officialEmail?.trim().toLowerCase() || null;
  const adminEmail = input.adminEmail?.trim().toLowerCase() || null;
  if (schoolName.length < 2 || input.schoolType.trim().length < 2 || input.county.trim().length < 2 || contactPhone.length < 7 || input.headInstitutionName.trim().length < 2 || input.adminFullName.trim().length < 2 || preferredUsername.length < 3) fail("REGISTRATION_REQUIRED_FIELDS");
  if (!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(preferredUsername)) fail("USERNAME_INVALID");
  if (registrationIdentifier) {
    const duplicateIdentifier = (await db.select({ id: schoolRegistrations.id }).from(schoolRegistrations).where(eq(schoolRegistrations.registrationIdentifier, registrationIdentifier)).limit(1))[0];
    if (duplicateIdentifier) fail("POSSIBLE_DUPLICATE_REGISTRATION");
  }
  const duplicateNameAndContact = (await db.select({ id: schools.id }).from(schools).leftJoin(schoolSettings, eq(schoolSettings.schoolId, schools.id)).where(or(and(eq(schools.schoolName, schoolName), eq(schoolSettings.phone, contactPhone)), eq(schoolSettings.phone, contactPhone))).limit(1))[0];
  if (duplicateNameAndContact) fail("POSSIBLE_DUPLICATE_REGISTRATION");
  const usernameTaken = (await db.select({ id: users.id }).from(users).where(or(eq(users.username, preferredUsername), adminEmail ? eq(users.email, adminEmail) : eq(users.username, "__never__"))).limit(1))[0];
  if (usernameTaken) fail("ADMIN_LOGIN_ALREADY_EXISTS");
  const now = new Date();
  const trialEndsAt = addDays(now, 30);
  const schoolCode = await uniqueSchoolCode(db, schoolName);
  const activationToken = crypto.randomBytes(32).toString("base64url");
  const school = (await db.insert(schools).values({ schoolCode, schoolName, county: input.county.trim(), subcounty: input.subcounty?.trim() || null, headInstitutionName: input.headInstitutionName.trim(), status: "pending_activation", trialStartedAt: now, trialEndsAt: trialEndsAt }).$returningId())[0];
  await db.insert(schoolSettings).values({ schoolId: school.id, schoolName, currentTerm: "Term 1", academicYear: now.getFullYear(), phone: contactPhone, email: officialEmail });
  const user = (await db.insert(users).values({ openId: `registration:${crypto.randomBytes(16).toString("hex")}`, schoolId: school.id, username: preferredUsername, name: input.adminFullName.trim(), email: adminEmail, passwordHash: null, accountStatus: "pending_activation", role: "admin", mustChangePassword: 0 }).$returningId())[0];
  await db.insert(staffProfiles).values({ schoolId: school.id, userId: user.id, staffId: `ADMIN-${schoolCode}`, displayName: input.adminFullName.trim(), email: adminEmail, phone: input.adminPhone?.trim() || contactPhone, role: "admin", status: "active" });
  await db.insert(schoolMemberships).values({ userId: user.id, schoolId: school.id, status: "active" });
  const registration = (await db.insert(schoolRegistrations).values({ schoolId: school.id, schoolType: input.schoolType.trim(), registrationIdentifier, contactPhone, officialEmail, headInstitutionName: input.headInstitutionName.trim(), adminFullName: input.adminFullName.trim(), adminEmail, adminPhone: input.adminPhone?.trim() || null, preferredUsername, activationTokenHash: hash(activationToken), activationExpiresAt: addDays(now, 2), status: "pending" }).$returningId())[0];
  await db.insert(schoolSubscriptions).values({ schoolId: school.id, status: "trialing", trialStartedAt: now, trialEndsAt, createdAt: now, updatedAt: now });
  await db.insert(auditLogs).values({ schoolId: school.id, userId: null, action: "platform.school.registration", entityType: "school_registration", entityId: String(registration.id), metadata: JSON.stringify({ schoolCode, schoolName, contactPhone, adminUsername: preferredUsername, requestIp: req?.ip ?? null }) });
  return { registrationId: registration.id, schoolCode, schoolName, trialStartedAt: now, trialEndsAt, activationToken, activationExpiresAt: addDays(now, 2) };
}

export async function activateRegisteredAdmin(input: { token: string; password: string }, req?: Request) {
  const db = await requireDb();
  if (input.password.length < 10 || !/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) fail("PASSWORD_TOO_WEAK");
  const registration = (await db.select({ registration: schoolRegistrations, school: schools, user: users }).from(schoolRegistrations).innerJoin(schools, eq(schools.id, schoolRegistrations.schoolId)).innerJoin(users, eq(users.schoolId, schoolRegistrations.schoolId)).where(and(eq(schoolRegistrations.activationTokenHash, hash(input.token)), eq(schoolRegistrations.status, "pending"))).limit(1))[0];
  if (!registration || registration.registration.activationExpiresAt.getTime() <= Date.now()) fail("ACTIVATION_LINK_EXPIRED");
  const passwordHash = await bcrypt.hash(input.password, 12);
  await db.update(users).set({ passwordHash, accountStatus: "active", mustChangePassword: 0, passwordChangedAt: new Date() }).where(and(eq(users.id, registration.user.id), eq(users.schoolId, registration.school.id)));
  await db.update(schools).set({ status: "active" }).where(eq(schools.id, registration.school.id));
  await db.update(schoolRegistrations).set({ status: "completed", completedAt: new Date() }).where(eq(schoolRegistrations.id, registration.registration.id));
  await db.insert(auditLogs).values({ schoolId: registration.school.id, userId: registration.user.id, action: "platform.school.activation", entityType: "school_registration", entityId: String(registration.registration.id), metadata: JSON.stringify({ schoolCode: registration.school.schoolCode, requestIp: req?.ip ?? null }) });
  return { ok: true, schoolCode: registration.school.schoolCode, username: registration.user.username };
}

export async function listRegistrations(userId: number) {
  const db = await requireDb();
  const admin = (await db.select({ role: staffProfiles.role }).from(staffProfiles).where(and(eq(staffProfiles.userId, userId), eq(staffProfiles.role, "super_admin"))).limit(1))[0];
  if (!admin) fail("ONLY_PLATFORM_SUPER_ADMIN");
  return db.select({ registration: schoolRegistrations, school: schools }).from(schoolRegistrations).innerJoin(schools, eq(schools.id, schoolRegistrations.schoolId)).orderBy(schoolRegistrations.createdAt);
}
