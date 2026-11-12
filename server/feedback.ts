import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { can, MANAGE_PERMISSIONS } from "./access";
import { nexusFeedback, schools, schoolSettings, users } from "../drizzle/schema";

export async function submitFeedback(input: { rating: number; message: string }, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const account = (await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, userId)).limit(1))[0];
  await db.insert(nexusFeedback).values({ schoolId: account?.schoolId ?? null, userId, rating: input.rating, message: input.message.trim() });
  return { ok: true };
}

export async function listFeedback(user: { id: number; role: string; username?: string | null; email?: string | null }) {
  if (!(await can(user.id, user.role, MANAGE_PERMISSIONS))) throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.select({ feedback: nexusFeedback, user: { name: users.name, username: users.username, email: users.email, role: users.role }, school: { schoolName: schools.schoolName, schoolCode: schools.schoolCode, county: schools.county, subcounty: schools.subcounty, headInstitutionName: schools.headInstitutionName, contactPhone: schoolSettings.phone, officialEmail: schoolSettings.email } })
    .from(nexusFeedback).leftJoin(users, eq(users.id, nexusFeedback.userId)).leftJoin(schools, eq(schools.id, nexusFeedback.schoolId)).leftJoin(schoolSettings, eq(schoolSettings.schoolId, nexusFeedback.schoolId))
    .orderBy(desc(nexusFeedback.createdAt));
}
