import { describe, expect, it } from "vitest";
import { permissionCatalog, permissionsByRole } from "./smis";
import { ASSIGNABLE_ROLES, ROLE_LABELS, permissionRole, rolesCanCreateAssessments, rolesCanViewWholeClassMarklist } from "./access";

describe("NEXUS-SMIS permission model", () => {
  it("includes the critical granular permissions", () => {
    const keys = permissionCatalog.map(([key]) => key);
    expect(keys).toEqual(expect.arrayContaining([
      "learners.add",
      "learners.deactivate",
      "attendance.edit",
      "assessments.edit",
      "finance.edit",
      "store.edit",
      "settings.edit",
      "ai.access",
    ]));
  });

  it("keeps role defaults least-privilege by default", () => {
    expect(permissionsByRole.teacher).not.toContain("finance.view");
    expect(permissionsByRole.teacher).not.toContain("learners.view");
    expect(permissionsByRole.teacher).not.toContain("reports.view");
    expect(permissionsByRole.class_teacher).toContain("reports.view");
    expect(permissionsByRole.class_teacher).not.toContain("learners.view");
    expect(permissionsByRole.finance).toContain("finance.view");
    expect(permissionsByRole.finance).not.toContain("reports.view");
    expect(permissionsByRole.storekeeper).toContain("store.edit");
    expect(permissionsByRole.storekeeper).not.toContain("finance.view");
    expect(permissionsByRole.teacher).toContain("counselling.submit");
    expect(permissionsByRole.teacher).not.toContain("counselling.view");
    expect(permissionsByRole.admin).toContain("archives.view");
    expect(permissionsByRole.admin).toContain("archives.edit");
    expect(permissionsByRole.admin).not.toContain("counselling.view");
  });

  it("keeps Exam Council read-only for consolidated marklists", () => {
    expect(permissionsByRole.exam_council).toEqual(expect.arrayContaining(["assessments.view", "marklists.view"]));
    expect(permissionsByRole.exam_council).not.toContain("assessments.edit");
    expect(rolesCanViewWholeClassMarklist(["exam_council"])).toBe(true);
    expect(rolesCanCreateAssessments(["exam_council"])).toBe(false);
    expect(rolesCanCreateAssessments(["teacher", "exam_council"])).toBe(false);
    expect(rolesCanCreateAssessments(["admin"])).toBe(true);
  });

  it("exposes the requested leadership roles without changing their permission families", () => {
    expect(ASSIGNABLE_ROLES).toEqual(expect.arrayContaining(["deputy_head", "senior_teacher", "head_teacher"]));
    expect(ROLE_LABELS.deputy_head).toBe("Deputy");
    expect(ROLE_LABELS.senior_teacher).toBe("Senior Teacher");
    expect(ROLE_LABELS.head_teacher).toBe("Head of Department");
    expect(permissionRole("deputy_head")).toBe("admin");
    expect(permissionRole("senior_teacher")).toBe("teacher");
    expect(permissionRole("head_teacher")).toBe("admin");
  });
});
