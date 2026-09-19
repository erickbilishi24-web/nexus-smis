import { describe, expect, it } from "vitest";
import { assertScore, cbcLevel, timetableConflicts } from "./smis";

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
});
