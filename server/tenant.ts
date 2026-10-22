import { eq } from "drizzle-orm";
import { schools, users } from "../drizzle/schema";
import { requireDb } from "./smis";
import { computePermissions } from "./access";

export type TenantContext = {
  userId: number;
  schoolId: number;
  role: string;
  isPlatformSuperAdmin: boolean;
};

export async function getTenantContext(userId: number): Promise<TenantContext> {
  const db = await requireDb();
  const row = (await db.select({ userId: users.id, schoolId: users.schoolId, role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!row) throw new Error("USER_NOT_FOUND");
  if (!row.schoolId) throw new Error("SCHOOL_ASSIGNMENT_REQUIRED");
  const school = (await db.select({ id: schools.id }).from(schools).where(eq(schools.id, row.schoolId)).limit(1))[0];
  if (!school) throw new Error("SCHOOL_NOT_FOUND");
  const permissions = await computePermissions(row.userId, row.role);
  return { userId: row.userId, schoolId: row.schoolId, role: row.role, isPlatformSuperAdmin: permissions.includes("*") };
}

export function assertSameTenant(actorSchoolId: number, targetSchoolId: number | null | undefined): void {
  if (!targetSchoolId || actorSchoolId !== targetSchoolId) throw new Error("CROSS_SCHOOL_ACCESS_DENIED");
}
