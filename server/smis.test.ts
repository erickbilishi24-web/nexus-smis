import { describe, expect, it } from "vitest";
import { allocationContextConflict, assertScore, cbcLevel, timetableConflicts } from "./smis";

describe("Kenyan SMIS backend rules", () => {
  it("maps the CBC eight-level scale correctly", () => {
    expect(cbcLevel(95)).toBe("EE1");
    expect(cbcLevel(80)).toBe("EE2");
    expect(cbcLevel(65)).toBe("ME1");
    expect(cbcLevel(45)).toBe("ME2");
    expect(cbcLevel(35)).toBe("AE1");
    expect(cbcLevel(25)).toBe("AE2");
    expect(cbcLevel(15)).toBe("BE1");
    expect(cbcLevel(5)).toBe("BE2");
  });

  it("rejects marks outside the 0-100 range", () => {
    expect(assertScore(88.25)).toBe(88.25);
    expect(() => assertScore(-1)).toThrow();
    expect(() => assertScore(101)).toThrow();
  });

  it("detects grade, teacher, and room timetable clashes", () => {
    const conflicts = timetableConflicts([
      { dayOfWeek: 1, period: 1, gradeId: 8, teacherUserId: 2, room: "8B" },
      { dayOfWeek: 1, period: 1, gradeId: 8, teacherUserId: 3, room: "8C" },
      { dayOfWeek: 1, period: 1, gradeId: 7, teacherUserId: 3, room: "8B" },
    ]);
    expect(conflicts).toContain("grade:1:1:8");
    expect(conflicts).toContain("teacher:1:1:3");
    expect(conflicts).toContain("room:1:1:8B");
  });

  it("treats active teacher allocations as the authoritative conflict boundary", () => {
    const activeEnglish = { gradeId: 2, subjectId: 2, allocationType: "learning_area" as const, status: "active" as const, startsOn: null, endsOn: null };
    expect(allocationContextConflict({ gradeId: 2, subjectId: 2, allocationType: "learning_area", startsOn: "2026-05-01", endsOn: "2026-05-31" }, activeEnglish)).toBe(true);
    expect(allocationContextConflict({ gradeId: 2, subjectId: 2, allocationType: "learning_area", startsOn: "2027-01-01", endsOn: "2027-01-31" }, { ...activeEnglish, startsOn: "2026-01-01", endsOn: "2026-12-31" })).toBe(false);
    expect(allocationContextConflict({ gradeId: 2, subjectId: 0, allocationType: "class_teacher" }, { ...activeEnglish, allocationType: "class_teacher" })).toBe(true);
    expect(allocationContextConflict({ gradeId: 2, subjectId: 2, allocationType: "learning_area" }, { ...activeEnglish, status: "inactive" })).toBe(false);
  });
});
