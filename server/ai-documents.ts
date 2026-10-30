import { desc, eq } from "drizzle-orm";
import { nexusAiDocuments } from "../drizzle/schema";
import { getDb } from "./db";
import { actorSchoolId, writeAudit } from "./smis";

export type CreateAiDocumentInput = {
  documentType: string;
  title: string;
  grade: string;
  subject: string;
  term: string;
  topic: string;
  body: string;
};

export async function listNexusAiDocuments(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const schoolId = await actorSchoolId(userId);
  return db.select().from(nexusAiDocuments)
    .where(eq(nexusAiDocuments.schoolId, schoolId))
    .orderBy(desc(nexusAiDocuments.createdAt)).limit(100);
}

export async function createNexusAiDocument(input: CreateAiDocumentInput, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const schoolId = await actorSchoolId(userId);
  const result = await db.insert(nexusAiDocuments).values({
    schoolId,
    userId,
    documentType: input.documentType.trim(),
    title: input.title.trim(),
    grade: input.grade.trim(),
    subject: input.subject.trim(),
    term: input.term.trim(),
    topic: input.topic.trim(),
    body: input.body,
  });
  const id = Number(result[0].insertId);
  await writeAudit(userId, "ai.document.created", "nexus_ai_document", String(id), { documentType: input.documentType, title: input.title });
  return { id };
}
