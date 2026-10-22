import { describe, expect, it } from "vitest";
import { assertStrongPassword, generateTemporaryPassword, isValidSchoolCode, normalizeSchoolCode } from "./administration";

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
});
