import { describe, expect, it } from "vitest";
import { assertSameTenant } from "./tenant";
import { schoolStorageKey } from "./storage";
import { permissionsByRole } from "./smis";

describe("two-school acceptance boundary", () => {
  const schoolA = 101;
  const schoolB = 202;

  it("allows records only within the actor school and rejects the other school", () => {
    expect(() => assertSameTenant(schoolA, schoolA)).not.toThrow();
    expect(() => assertSameTenant(schoolA, schoolB)).toThrow("CROSS_SCHOOL_ACCESS_DENIED");
    expect(() => assertSameTenant(schoolB, schoolA)).toThrow("CROSS_SCHOOL_ACCESS_DENIED");
  });

  it("keeps generated files physically separated by school", () => {
    expect(schoolStorageKey(schoolA, "imports/learners.xlsx")).toBe("schools/101/imports/learners.xlsx");
    expect(schoolStorageKey(schoolB, "imports/learners.xlsx")).toBe("schools/202/imports/learners.xlsx");
  });

  it("preserves the platform/school permission distinction", () => {
    expect(permissionsByRole.super_admin).toContain("*");
    expect(permissionsByRole.admin).not.toContain("*");
    expect(permissionsByRole.teacher).not.toContain("finance.view");
  });
});
