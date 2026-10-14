import { desc, eq } from "drizzle-orm";
import { nexusAiTransactions } from "../drizzle/schema";
import { getDb } from "./db";

export async function listNexusAiTransactions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db.select().from(nexusAiTransactions).where(eq(nexusAiTransactions.userId, userId)).orderBy(desc(nexusAiTransactions.createdAt)).limit(100);
}
