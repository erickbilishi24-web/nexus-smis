import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { can, MANAGE_PERMISSIONS } from "./access";
import { nexusFeedback, users } from "../drizzle/schema";

export async function submitFeedback(input: { rating: number; message: string }, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.insert(nexusFeedback).values({ userId, rating: input.rating, message: input.message.trim() });
  return { ok: true };
}

export async function listFeedback(user: { id: number; role: string; username?: string | null; email?: string | null }) {
  if (!(await can(user.id, user.role, MANAGE_PERMISSIONS))) throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.select({ feedback: nexusFeedback, user: { name: users.name, username: users.username, email: users.email } })
    .from(nexusFeedback).leftJoin(users, eq(users.id, nexusFeedback.userId))
    .orderBy(desc(nexusFeedback.createdAt));
}
