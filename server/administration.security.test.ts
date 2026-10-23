import { describe, expect, it } from "vitest";
import { assertAdminAccountDeletionAllowed, assertStrongPassword, generateTemporaryPassword, isValidSchoolCode, normalizeSchoolCode } from "./administration";

describe("multi-school administration security helpers", () => {
  it("normalizes school codes before validation", () => {
    expect(normalizeSchoolCode("  school-001 ")).toBe("SCHOOL-001");
    expect(isValidSchoolCode("  school-001 ")).toBe(true);
    expect(isValidSchoolCode("ab")).toBe(false);
    expect(isValidSchoolCode("school code")).toBe(false);
  });

  it("generates a strong temporary password without exposing a fixed credential", () => {
    const one = generateTemporaryPassword();
    const two = generateTemporaryPassword();
    expect(one).toMatch(/^Nexus-7-[A-Za-z0-9_-]{16,}$/);
    expect(two).toMatch(/^Nexus-7-[A-Za-z0-9_-]{16,}$/);
    expect(one).not.toBe(two);
    expect(() => assertStrongPassword(one)).not.toThrow();
  });

  it("blocks deleting the signed-in account", () => {
    expect(() => assertAdminAccountDeletionAllowed(7, 7, false, true)).toThrow("CANNOT_DELETE_OWN_ACCOUNT");
  });

  it("protects the last active Super Administrator while allowing another manager's presence", () => {
    expect(() => assertAdminAccountDeletionAllowed(7, 8, true, false)).toThrow("LAST_SUPER_ADMIN_PROTECTED");
    expect(() => assertAdminAccountDeletionAllowed(7, 8, true, true)).not.toThrow();
    expect(() => assertAdminAccountDeletionAllowed(7, 8, false, false)).not.toThrow();
  });
});
