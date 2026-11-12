import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { Request } from "express";
import { getDb } from "./db";
import { getAccessProfile } from "./access";
import { auditLogs, platformPaymentMethods, platformSubscriptionPayments, schoolSubscriptions, schools, subscriptionPlans, users } from "../drizzle/schema";
import { writeAudit } from "./smis";
import { sendTransactionalEmail } from "./email";

export class PlatformError extends Error {}
const fail = (code: string): never => { throw new PlatformError(code); };
async function requireDb() { const db = await getDb(); if (!db) throw new PlatformError("DATABASE_UNAVAILABLE"); return db; }
async function assertPlatformAdmin(userId: number) {
  const profile = await getAccessProfile(userId);
  if (profile.level !== "system") fail("ONLY_PLATFORM_SUPER_ADMIN");
}
const json = (value: unknown) => value == null ? null : JSON.stringify(value);

export async function listSubscriptionPlans(includeInactive = false) {
  const db = await requireDb();
  return db.select().from(subscriptionPlans).where(includeInactive ? undefined : eq(subscriptionPlans.active, 1)).orderBy(subscriptionPlans.name);
}

export async function saveSubscriptionPlan(input: { id?: number; name: string; description?: string | null; price: number; billingPeriod: string; durationDays: number; includedFeatures?: string[]; eligibility?: string; active?: boolean }, userId: number, req?: Request) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  const name = input.name.trim();
  if (name.length < 2) fail("PLAN_NAME_REQUIRED");
  if (!Number.isFinite(input.price) || input.price < 0) fail("PLAN_PRICE_INVALID");
  if (!Number.isInteger(input.durationDays) || input.durationDays < 1) fail("PLAN_DURATION_INVALID");
  const values = { name, description: input.description?.trim() || null, price: input.price.toFixed(2), billingPeriod: input.billingPeriod.trim(), durationDays: input.durationDays, includedFeatures: json(input.includedFeatures ?? []), eligibility: input.eligibility?.trim() || "all_schools", active: input.active === false ? 0 : 1, createdByUserId: userId };
  if (input.id) {
    const existing = (await db.select({ id: subscriptionPlans.id }).from(subscriptionPlans).where(eq(subscriptionPlans.id, input.id)).limit(1))[0];
    if (!existing) fail("PLAN_NOT_FOUND");
    await db.update(subscriptionPlans).set(values).where(eq(subscriptionPlans.id, input.id));
    await writeAudit(userId, "platform.subscription_plan.update", "subscription_plan", input.id, { ...values, id: input.id });
    return { id: input.id };
  }
  const inserted = (await db.insert(subscriptionPlans).values(values).$returningId())[0];
  await writeAudit(userId, "platform.subscription_plan.create", "subscription_plan", inserted.id, values);
  return { id: inserted.id };
}

export async function setSubscriptionPlanStatus(input: { id: number; active: boolean }, userId: number, req?: Request) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  await db.update(subscriptionPlans).set({ active: input.active ? 1 : 0 }).where(eq(subscriptionPlans.id, input.id));
  await writeAudit(userId, "platform.subscription_plan.status", "subscription_plan", input.id, { active: input.active });
  return { ok: true };
}

export async function deleteSubscriptionPlan(id: number, userId: number, req?: Request) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  const used = (await db.select({ id: schoolSubscriptions.id }).from(schoolSubscriptions).where(eq(schoolSubscriptions.planId, id)).limit(1))[0];
  if (used) fail("PLAN_HAS_SUBSCRIPTIONS");
  await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  await writeAudit(userId, "platform.subscription_plan.delete", "subscription_plan", id, {});
  return { ok: true };
}

export async function listPaymentMethods(includeDisabled = false) {
  const db = await requireDb();
  return db.select().from(platformPaymentMethods).where(includeDisabled ? undefined : and(eq(platformPaymentMethods.enabled, 1), eq(platformPaymentMethods.visibleToSchools, 1))).orderBy(platformPaymentMethods.displayOrder, platformPaymentMethods.name);
}

export async function listPlatformPaymentMethods(userId: number) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  return db.select().from(platformPaymentMethods).orderBy(platformPaymentMethods.displayOrder, platformPaymentMethods.name);
}

export async function savePaymentMethod(input: { id?: number; name: string; category: string; identifier?: string | null; accountReference?: string | null; description?: string | null; instructions?: string | null; visibleToSchools?: boolean; enabled?: boolean; displayOrder?: number }, userId: number, req?: Request) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  const name = input.name.trim();
  if (name.length < 2) fail("PAYMENT_METHOD_NAME_REQUIRED");
  if (!input.category.trim()) fail("PAYMENT_METHOD_CATEGORY_REQUIRED");
  const values = { name, category: input.category.trim(), identifier: input.identifier?.trim() || null, accountReference: input.accountReference?.trim() || null, description: input.description?.trim() || null, instructions: input.instructions?.trim() || null, visibleToSchools: input.visibleToSchools ? 1 : 0, enabled: input.enabled === false ? 0 : 1, displayOrder: input.displayOrder ?? 0, createdByUserId: userId };
  if (input.id) {
    await db.update(platformPaymentMethods).set(values).where(eq(platformPaymentMethods.id, input.id));
    await writeAudit(userId, "platform.payment_method.update", "payment_method", input.id, { ...values, id: input.id });
    return { id: input.id };
  }
  const inserted = (await db.insert(platformPaymentMethods).values(values).$returningId())[0];
  await writeAudit(userId, "platform.payment_method.create", "payment_method", inserted.id, values);
  return { id: inserted.id };
}

export async function deletePaymentMethod(id: number, userId: number, req?: Request) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  const used = (await db.select({ id: platformSubscriptionPayments.id }).from(platformSubscriptionPayments).where(eq(platformSubscriptionPayments.paymentMethodId, id)).limit(1))[0];
  if (used) fail("PAYMENT_METHOD_HAS_HISTORY");
  await db.delete(platformPaymentMethods).where(eq(platformPaymentMethods.id, id));
  await writeAudit(userId, "platform.payment_method.delete", "payment_method", id, {});
  return { ok: true };
}

export async function listSchoolSubscriptions(userId: number, includeAll = false) {
  const db = await requireDb();
  const profile = await getAccessProfile(userId);
  const account = (await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const rows = await db.select({ subscription: schoolSubscriptions, school: schools, plan: subscriptionPlans })
    .from(schoolSubscriptions).innerJoin(schools, eq(schools.id, schoolSubscriptions.schoolId)).leftJoin(subscriptionPlans, eq(subscriptionPlans.id, schoolSubscriptions.planId))
    .where(includeAll && profile.level === "system" ? undefined : account?.schoolId ? eq(schoolSubscriptions.schoolId, account.schoolId) : eq(schoolSubscriptions.schoolId, -1))
    .orderBy(desc(schoolSubscriptions.createdAt));
  return rows;
}

export async function listPlatformPayments(userId: number) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  return db.select({ payment: platformSubscriptionPayments, schoolName: schools.schoolName, schoolCode: schools.schoolCode, planName: subscriptionPlans.name })
    .from(platformSubscriptionPayments).innerJoin(schools, eq(schools.id, platformSubscriptionPayments.schoolId)).leftJoin(subscriptionPlans, eq(subscriptionPlans.id, platformSubscriptionPayments.planId)).orderBy(desc(platformSubscriptionPayments.createdAt));
}

export async function submitSubscriptionPayment(input: { amount: number; planId?: number | null; paymentMethodId?: number | null; externalReference: string; provider?: string | null }, userId: number) {
  const db = await requireDb();
  const account = (await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const schoolId = Number(account?.schoolId ?? 0);
  if (schoolId <= 0) fail("SCHOOL_CONTEXT_REQUIRED");
  const subscription = (await db.select().from(schoolSubscriptions).where(eq(schoolSubscriptions.schoolId, schoolId)).orderBy(desc(schoolSubscriptions.id)).limit(1))[0];
  if (!subscription) fail("SUBSCRIPTION_NOT_FOUND");
  if (!Number.isFinite(input.amount) || input.amount <= 0 || !input.externalReference.trim()) fail("PAYMENT_DETAILS_REQUIRED");
  const inserted = (await db.insert(platformSubscriptionPayments).values({ schoolId, subscriptionId: subscription.id, planId: input.planId ?? subscription.planId ?? undefined, paymentMethodId: input.paymentMethodId ?? undefined, amount: input.amount.toFixed(2), externalReference: input.externalReference.trim(), provider: input.provider?.trim() || "manual", status: "submitted" }).$returningId())[0];
  await db.update(schoolSubscriptions).set({ status: "pending_payment" }).where(eq(schoolSubscriptions.id, subscription.id));
  return { ok: true, id: inserted.id };
}

export async function verifySubscriptionPayment(input: { id: number; status: "verified" | "rejected"; reason?: string | null }, userId: number, req?: Request) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  const payment = (await db.select({ payment: platformSubscriptionPayments, school: schools, subscription: schoolSubscriptions, plan: subscriptionPlans }).from(platformSubscriptionPayments).innerJoin(schools, eq(schools.id, platformSubscriptionPayments.schoolId)).innerJoin(schoolSubscriptions, eq(schoolSubscriptions.id, platformSubscriptionPayments.subscriptionId)).leftJoin(subscriptionPlans, eq(subscriptionPlans.id, platformSubscriptionPayments.planId)).where(eq(platformSubscriptionPayments.id, input.id)).limit(1))[0];
  if (!payment) fail("PAYMENT_NOT_FOUND");
  const now = new Date();
  const ends = payment.plan?.durationDays ? new Date(now.getTime() + payment.plan.durationDays * 86400000) : null;
  await db.update(platformSubscriptionPayments).set({ status: input.status, verifiedByUserId: userId, verifiedAt: now, providerPayload: input.reason?.trim() ? JSON.stringify({ reason: input.reason.trim() }) : null }).where(eq(platformSubscriptionPayments.id, input.id));
  await db.update(schoolSubscriptions).set({ status: input.status === "verified" ? "active" : "pending_payment", planId: payment.payment.planId, startsAt: input.status === "verified" ? now : null, endsAt: input.status === "verified" ? ends : null, agreedPrice: payment.payment.amount, planSnapshot: payment.plan ? JSON.stringify(payment.plan) : null }).where(eq(schoolSubscriptions.id, payment.payment.subscriptionId));
  await writeAudit(userId, `platform.payment.${input.status}`, "platform_payment", input.id, { schoolId: payment.payment.schoolId, reference: payment.payment.externalReference, reason: input.reason ?? null });
  if (input.status === "verified") {
    const recipient = process.env.SUPER_ADMIN_EMAIL?.trim() || process.env.OWNER_EMAIL?.trim();
    const message = `Payment verified for ${payment.school.schoolName} (${payment.school.schoolCode}). Amount: KES ${payment.payment.amount}. Reference: ${payment.payment.externalReference}. Verified at: ${now.toISOString()}.`;
    if (recipient) await sendTransactionalEmail({ to: recipient, subject: `NEXUS payment verified · ${payment.school.schoolName}`, text: message });
  }
  return { ok: true, status: input.status, endsAt: ends };
}

export async function extendSchoolTrial(input: { schoolId: number; days: number; reason: string }, userId: number, req?: Request) {
  await assertPlatformAdmin(userId);
  const db = await requireDb();
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 365) fail("TRIAL_EXTENSION_INVALID");
  if (input.reason.trim().length < 5) fail("TRIAL_EXTENSION_REASON_REQUIRED");
  const current = (await db.select().from(schoolSubscriptions).where(and(eq(schoolSubscriptions.schoolId, input.schoolId), eq(schoolSubscriptions.status, "trialing"))).orderBy(desc(schoolSubscriptions.id)).limit(1))[0];
  if (!current) fail("TRIAL_NOT_FOUND");
  const base = current.trialEndsAt && current.trialEndsAt > new Date() ? current.trialEndsAt : new Date();
  const ends = new Date(base.getTime() + input.days * 86400000);
  await db.update(schoolSubscriptions).set({ trialEndsAt: ends, extensionReason: input.reason.trim() }).where(eq(schoolSubscriptions.id, current.id));
  await db.update(schools).set({ trialEndsAt: ends }).where(eq(schools.id, input.schoolId));
  await writeAudit(userId, "platform.trial.extend", "school", input.schoolId, { days: input.days, reason: input.reason.trim(), endsAt: ends.toISOString() });
  return { ok: true, trialEndsAt: ends };
}

export async function getSubscriptionSummary(userId: number) {
  const rows = await listSchoolSubscriptions(userId);
  const row = rows[0];
  if (!row) return { status: "unconfigured" as const, school: null, plan: null, daysRemaining: null, trialEndsAt: null };
  const ends = row.subscription.endsAt ?? row.subscription.trialEndsAt;
  const daysRemaining = ends ? Math.max(0, Math.ceil((new Date(ends).getTime() - Date.now()) / 86400000)) : null;
  return { status: row.subscription.status, school: row.school, plan: row.plan, daysRemaining, trialEndsAt: row.subscription.trialEndsAt };
}
