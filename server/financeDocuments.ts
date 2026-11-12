import { and, desc, eq } from "drizzle-orm";
import { financeDocuments } from "../drizzle/schema";
import { actorSchoolId, requireDb } from "./smis";

export async function listFinanceDocuments(userId: number, type?: "voucher" | "receipt") {
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  return db.select().from(financeDocuments).where(type ? and(eq(financeDocuments.schoolId, schoolId), eq(financeDocuments.documentType, type)) : eq(financeDocuments.schoolId, schoolId)).orderBy(desc(financeDocuments.createdAt));
}

export async function createFinanceDocument(input: { documentType: "voucher" | "receipt"; documentNumber: string; documentDate: string; amount: number; partyName: string; description: string; paymentMethod?: string | null; reference?: string | null }, userId: number) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("INVALID_AMOUNT");
  const documentNumber = input.documentNumber.trim();
  if (!documentNumber || !input.partyName.trim() || !input.description.trim()) throw new Error("FINANCE_DOCUMENT_REQUIRED_FIELDS");
  const db = await requireDb();
  const schoolId = await actorSchoolId(userId);
  const existing = (await db.select({ id: financeDocuments.id }).from(financeDocuments).where(and(eq(financeDocuments.schoolId, schoolId), eq(financeDocuments.documentNumber, documentNumber))).limit(1))[0];
  if (existing) throw new Error("DOCUMENT_NUMBER_ALREADY_EXISTS");
  const inserted = (await db.insert(financeDocuments).values({ schoolId, documentType: input.documentType, documentNumber, documentDate: new Date(`${input.documentDate}T00:00:00.000Z`), amount: input.amount.toFixed(2), partyName: input.partyName.trim(), description: input.description.trim(), paymentMethod: input.paymentMethod?.trim() || null, reference: input.reference?.trim() || null, createdByUserId: userId }).$returningId())[0];
  return { ok: true, id: inserted.id };
}
