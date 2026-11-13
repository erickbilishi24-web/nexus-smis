import crypto from "node:crypto";
import type { Request } from "express";
import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "./db";
import { getAccessProfile } from "./access";
import { notifyOwner } from "./_core/notification";
import { resolvePublicAppUrl } from "./_core/env";
import { sendTransactionalEmail } from "./email";
import {
  auditLogs,
  schoolApplications,
  schoolMemberships,
  schoolRegistrations,
  schoolSettings,
  schoolSubscriptions,
  schools,
  staffProfiles,
  users,
} from "../drizzle/schema";

export class OnboardingError extends Error {}
const fail = (code: string): never => { throw new OnboardingError(code); };
async function requireDb() { const db = await getDb(); if (!db) throw new OnboardingError("DATABASE_UNAVAILABLE"); return db; }
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const clean = (value: string | null | undefined) => value?.trim() || null;
const codePart = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SCHOOL";
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000);

async function assertPlatformAdmin(userId: number) {
  const profile = await getAccessProfile(userId);
  if (profile.level !== "system") fail("ONLY_PLATFORM_SUPER_ADMIN");
}

async function uniqueReference(db: any) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const referenceNumber = `NXS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const found = (await db.select({ id: schoolApplications.id }).from(schoolApplications).where(eq(schoolApplications.referenceNumber, referenceNumber)).limit(1))[0];
    if (!found) return referenceNumber;
  }
  throw new OnboardingError("APPLICATION_REFERENCE_GENERATION_FAILED");
}

async function uniqueSchoolCode(db: any, schoolName: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const schoolCode = `${codePart(schoolName)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const found = (await db.select({ id: schools.id }).from(schools).where(eq(schools.schoolCode, schoolCode)).limit(1))[0];
    if (!found) return schoolCode;
  }
  throw new OnboardingError("SCHOOL_CODE_GENERATION_FAILED");
}

async function uniqueAdminUsername(db: any, applicantName: string) {
  const pieces = applicantName.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const base = (pieces.length > 1 ? `${pieces[0]}.${pieces[pieces.length - 1]}` : pieces[0] || "school.admin").slice(0, 55);
  for (let attempt = 0; attempt < 20; attempt++) {
    const username = attempt === 0 ? base : `${base.slice(0, 50)}${attempt + 1}`;
    const found = (await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1))[0];
    if (!found) return username;
  }
  throw new OnboardingError("ADMIN_USERNAME_GENERATION_FAILED");
}

async function notifyPlatformAdmins(subject: string, text: string) {
  const recipient = process.env.SUPER_ADMIN_EMAIL?.trim() || process.env.OWNER_EMAIL?.trim();
  if (recipient) return sendTransactionalEmail({ to: recipient, subject, text });
  return notifyOwner({ title: subject, content: text });
}

export async function submitSchoolApplication(input: {
  schoolName: string;
  schoolType: string;
  county: string;
  subcounty?: string | null;
  town?: string | null;
  schoolPhone: string;
  schoolEmail?: string | null;
  registrationIdentifier?: string | null;
  headInstitutionName: string;
  applicantName: string;
  applicantPosition: string;
  applicantPhone: string;
  applicantEmail: string;
  message?: string | null;
}, req?: Request) {
  const db = await requireDb();
  const schoolName = input.schoolName.trim();
  const schoolType = input.schoolType.trim();
  const county = input.county.trim();
  const schoolPhone = input.schoolPhone.trim();
  const applicantName = input.applicantName.trim();
  const applicantPosition = input.applicantPosition.trim();
  const headInstitutionName = input.headInstitutionName.trim();
  const applicantPhone = input.applicantPhone.trim();
  const applicantEmail = input.applicantEmail.trim().toLowerCase();
  if (schoolName.length < 2 || schoolType.length < 2 || county.length < 2 || schoolPhone.length < 7 || headInstitutionName.length < 2 || applicantName.length < 2 || applicantPosition.length < 2 || applicantPhone.length < 7 || !applicantEmail.includes("@")) fail("APPLICATION_REQUIRED_FIELDS");
  const duplicate = (await db.select({ id: schoolApplications.id, status: schoolApplications.status }).from(schoolApplications).where(and(eq(schoolApplications.schoolName, schoolName), or(eq(schoolApplications.applicantEmail, applicantEmail), eq(schoolApplications.schoolPhone, schoolPhone)))).limit(1))[0];
  if (duplicate && ["new", "under_review", "approved"].includes(duplicate.status)) fail("APPLICATION_ALREADY_EXISTS");
  const referenceNumber = await uniqueReference(db);
  const createdAt = new Date();
  const inserted = (await db.insert(schoolApplications).values({ referenceNumber, schoolName, schoolType, county, subcounty: clean(input.subcounty), town: clean(input.town), schoolPhone, schoolEmail: clean(input.schoolEmail)?.toLowerCase() ?? null, registrationIdentifier: clean(input.registrationIdentifier), headInstitutionName, applicantName, applicantPosition, applicantPhone, applicantEmail, message: clean(input.message), status: "new", createdAt, updatedAt: createdAt }).$returningId())[0];
  await db.insert(auditLogs).values({ schoolId: null, userId: null, action: "platform.school_application.submit", entityType: "school_application", entityId: String(inserted.id), metadata: JSON.stringify({ referenceNumber, schoolName, applicantEmail, requestIp: req?.ip ?? null }) });
  const reviewText = `New NEXUS SMIS school application\nReference: ${referenceNumber}\nSchool: ${schoolName}\nType: ${schoolType}\nLocation: ${county}${input.subcounty ? `, ${input.subcounty}` : ""}${input.town ? `, ${input.town}` : ""}\nRegistration identifier: ${input.registrationIdentifier || "Not provided"}\nHead of institution: ${headInstitutionName}\nApplicant: ${applicantName} (${applicantPosition})\nEmail: ${applicantEmail}\nPhone: ${applicantPhone}`;
  const platformNotified = await notifyPlatformAdmins(`NEXUS school application · ${referenceNumber}`, reviewText);
  let applicantNotified = false;
  try {
    applicantNotified = await sendTransactionalEmail({ to: applicantEmail, subject: `NEXUS SMIS application received · ${referenceNumber}`, text: `Thank you. Your request for ${schoolName} has been received. Keep reference ${referenceNumber} for follow-up. A Platform Super Admin will review the application before any school or account is created.` });
  } catch (error) { console.warn("[Onboarding] applicant acknowledgement failed", error); }
  return { id: inserted.id, referenceNumber, status: "new" as const, platformNotified, applicantNotified };
}

export async function listSchoolApplications(userId: number) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  const rows = await db.select({ application: schoolApplications, schoolCode: schools.schoolCode, linkedSchoolName: schools.schoolName }).from(schoolApplications).leftJoin(schools, eq(schools.id, schoolApplications.schoolId)).orderBy(desc(schoolApplications.createdAt));
  return rows.map(row => ({ ...row.application, schoolCode: row.schoolCode, linkedSchoolName: row.linkedSchoolName }));
}

export async function updateSchoolApplication(input: { id: number; status?: "new" | "under_review" | "approved" | "rejected"; privateNotes?: string | null }, userId: number, req?: Request) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  const current = (await db.select().from(schoolApplications).where(eq(schoolApplications.id, input.id)).limit(1))[0];
  if (!current) fail("APPLICATION_NOT_FOUND");
  if (current.status === "onboarded") fail("APPLICATION_ALREADY_ONBOARDED");
  const nextStatus = input.status ?? current.status;
  if (nextStatus === "onboarded") fail("USE_CREATE_SCHOOL_FROM_APPLICATION");
  const now = new Date();
  const shouldProvision = current.status !== "approved" && nextStatus === "approved" && !current.schoolId;
  await db.update(schoolApplications).set({ status: nextStatus, privateNotes: input.privateNotes === undefined ? current.privateNotes : clean(input.privateNotes), reviewedByUserId: userId, reviewedAt: now, updatedAt: now }).where(eq(schoolApplications.id, input.id));
  await db.insert(auditLogs).values({ schoolId: current.schoolId ?? null, userId, action: "platform.school_application.review", entityType: "school_application", entityId: String(input.id), metadata: JSON.stringify({ referenceNumber: current.referenceNumber, from: current.status, to: nextStatus, hasPrivateNotes: Boolean(input.privateNotes), requestIp: req?.ip ?? null }) });
  let applicantNotified = false;
  if (current.status !== nextStatus && (nextStatus === "approved" || nextStatus === "rejected")) {
    const subject = `NEXUS SMIS application ${nextStatus} · ${current.referenceNumber}`;
    const text = nextStatus === "approved"
      ? `Your NEXUS SMIS school application has been approved.\nSchool: ${current.schoolName}\nReference: ${current.referenceNumber}\n\nYour School Registry workspace is now being created. You will receive a separate activation email when the administrator account is ready.`
      : `Your NEXUS SMIS school application was not approved at this time.\nSchool: ${current.schoolName}\nReference: ${current.referenceNumber}\n\nPlease contact the platform administrator if you need clarification.`;
    try { applicantNotified = await sendTransactionalEmail({ to: current.applicantEmail, subject, text }); } catch (error) { console.warn("[Onboarding] application decision email failed", error); }
  }
  const provisioned = shouldProvision ? await provisionSchoolFromApplication(input.id, userId, req) : null;
  return { ok: true, status: provisioned ? "onboarded" as const : nextStatus, applicantNotified, provisioned };
}

export async function provisionSchoolFromApplication(applicationId: number, userId: number, req?: Request) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  const application = (await db.select().from(schoolApplications).where(eq(schoolApplications.id, applicationId)).limit(1))[0];
  if (!application) fail("APPLICATION_NOT_FOUND");
  if (application.schoolId) {
    const linked = (await db.select({ schoolCode: schools.schoolCode, schoolName: schools.schoolName, status: schools.status }).from(schools).where(eq(schools.id, application.schoolId)).limit(1))[0];
    if (linked) return { ok: true, alreadyOnboarded: true, applicationId, schoolId: application.schoolId, schoolCode: linked.schoolCode, schoolName: linked.schoolName, loginUrl: `${resolvePublicAppUrl()}/school/${linked.schoolCode}/login`, activationUrl: null, adminUsername: null };
  }
  if (application.status !== "approved") fail("APPLICATION_MUST_BE_APPROVED");
  const now = new Date();
  const trialEndsAt = addDays(now, 30);
  const result = await db.transaction(async tx => {
    const schoolCode = await uniqueSchoolCode(tx, application.schoolName);
    const adminUsername = await uniqueAdminUsername(tx, application.applicantName);
    const activationToken = crypto.randomBytes(32).toString("base64url");
    const school = (await tx.insert(schools).values({ schoolCode, schoolName: application.schoolName, county: application.county, subcounty: application.subcounty, headInstitutionName: application.headInstitutionName || application.applicantName, status: "pending_activation", createdByUserId: userId, trialStartedAt: now, trialEndsAt, createdAt: now, updatedAt: now }).$returningId())[0];
    await tx.insert(schoolSettings).values({ schoolId: school.id, schoolName: application.schoolName, currentTerm: "Term 1", academicYear: now.getFullYear(), phone: application.schoolPhone, email: application.schoolEmail });
    const user = (await tx.insert(users).values({ openId: `onboarding:${crypto.randomBytes(16).toString("hex")}`, schoolId: school.id, username: adminUsername, name: application.applicantName, email: application.applicantEmail, passwordHash: null, accountStatus: "pending_activation", loginMethod: "password", role: "admin", mustChangePassword: 0, createdAt: now, updatedAt: now, lastSignedIn: now }).$returningId())[0];
    await tx.insert(staffProfiles).values({ schoolId: school.id, userId: user.id, staffId: `ADMIN-${schoolCode}`, displayName: application.applicantName, designation: application.applicantPosition, email: application.applicantEmail, phone: application.applicantPhone, role: "admin", status: "active", createdAt: now });
    await tx.insert(schoolMemberships).values({ userId: user.id, schoolId: school.id, status: "active", createdAt: now, updatedAt: now });
    await tx.insert(schoolRegistrations).values({ schoolId: school.id, schoolType: application.schoolType, contactPhone: application.schoolPhone, officialEmail: application.schoolEmail, registrationIdentifier: application.registrationIdentifier, headInstitutionName: application.headInstitutionName || application.applicantName, adminFullName: application.applicantName, adminEmail: application.applicantEmail, adminPhone: application.applicantPhone, preferredUsername: adminUsername, activationTokenHash: hash(activationToken), activationExpiresAt: addDays(now, 2), status: "pending", createdAt: now });
    await tx.insert(schoolSubscriptions).values({ schoolId: school.id, status: "trialing", trialStartedAt: now, trialEndsAt, createdByUserId: userId, createdAt: now, updatedAt: now });
    await tx.update(schoolApplications).set({ status: "onboarded", schoolId: school.id, onboardedAt: now, reviewedByUserId: userId, reviewedAt: now, updatedAt: now }).where(eq(schoolApplications.id, application.id));
    await tx.insert(auditLogs).values({ schoolId: school.id, userId, action: "platform.school_application.provision", entityType: "school_application", entityId: String(application.id), metadata: JSON.stringify({ referenceNumber: application.referenceNumber, schoolCode, adminUsername, requestIp: req?.ip ?? null }) });
    return { schoolId: school.id, schoolCode, schoolName: application.schoolName, adminUsername, activationToken, trialStartedAt: now, trialEndsAt };
  });
  const activationUrl = `${resolvePublicAppUrl()}/activate?token=${encodeURIComponent(result.activationToken)}`;
  const loginUrl = `${resolvePublicAppUrl()}/school/${result.schoolCode}/login`;
  const emailText = `Your NEXUS SMIS school workspace is ready.\nSchool: ${result.schoolName}\nSchool code: ${result.schoolCode}\nUsername: ${result.adminUsername}\nLogin: ${loginUrl}\nSet the administrator password securely here (expires in 48 hours): ${activationUrl}\n30-day trial ends: ${result.trialEndsAt.toISOString()}`;
  let emailSent = false;
  try { emailSent = await sendTransactionalEmail({ to: application.applicantEmail, subject: `NEXUS SMIS administrator activation · ${result.schoolName}`, text: emailText }); } catch (error) { console.warn("[Onboarding] activation email failed", error); }
  return { ok: true, alreadyOnboarded: false, applicationId, schoolId: result.schoolId, schoolCode: result.schoolCode, schoolName: result.schoolName, adminUsername: result.adminUsername, activationUrl, loginUrl, trialStartedAt: result.trialStartedAt, trialEndsAt: result.trialEndsAt, emailSent };
}


export async function resendApplicationActivationEmail(applicationId: number, userId: number) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  const row = (await db.select({ application: schoolApplications, school: schools, registration: schoolRegistrations, admin: users }).from(schoolApplications).leftJoin(schools, eq(schools.id, schoolApplications.schoolId)).leftJoin(schoolRegistrations, eq(schoolRegistrations.schoolId, schoolApplications.schoolId)).leftJoin(users, and(eq(users.schoolId, schoolApplications.schoolId), eq(users.role, "admin"))).where(eq(schoolApplications.id, applicationId)).limit(1))[0];
  if (!row?.application) fail("APPLICATION_NOT_FOUND");
  if (!row.school?.id || !row.registration || !row.admin) fail("APPLICATION_NOT_ONBOARDED");
  const school = row.school!;
  const registration = row.registration!;
  const admin = row.admin!;
  const activationToken = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  await db.update(schoolRegistrations).set({ activationTokenHash: hash(activationToken), activationExpiresAt: addDays(now, 2), status: "pending" }).where(eq(schoolRegistrations.id, registration.id));
  const activationUrl = `${resolvePublicAppUrl()}/activate?token=${encodeURIComponent(activationToken)}`;
  const loginUrl = `${resolvePublicAppUrl()}/school/${school.schoolCode}/login`;
  const emailSent = await sendTransactionalEmail({ to: row.application.applicantEmail, subject: `NEXUS SMIS administrator activation · ${school.schoolName}`, text: `Your NEXUS SMIS administrator activation link has been reissued.\nSchool: ${school.schoolName}\nSchool code: ${school.schoolCode}\nUsername: ${admin.username}\nLogin: ${loginUrl}\nSet the administrator password securely here (expires in 48 hours): ${activationUrl}` });
  await db.insert(auditLogs).values({ schoolId: school.id, userId, action: "platform.school_application.activation_email_resend", entityType: "school_application", entityId: String(applicationId), metadata: JSON.stringify({ referenceNumber: row.application.referenceNumber, email: row.application.applicantEmail, emailSent }) });
  return { ok: true, emailSent, activationUrl };
}
