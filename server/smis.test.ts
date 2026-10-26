import { describe, expect, it } from "vitest";
import { allocationContextConflict, assertScore, buildTimetableAuditRows, timetableEntriesAlignedWithAllocations, unallocatedTimetableEntries, canAccessAttendanceGrade, canCaptureAttendance, cbcLevel, isAttendanceAdmin, resolveImportGrade, timetableConflicts } from "./smis";

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

  it("limits attendance to leadership or the teacher's allocated grades", () => {
    expect(isAttendanceAdmin("admin")).toBe(true);
    expect(isAttendanceAdmin("user", "super_admin")).toBe(true);
    expect(isAttendanceAdmin("user", "teacher")).toBe(false);
    expect(canAccessAttendanceGrade("user", "teacher", [7], 7)).toBe(true);
    expect(canAccessAttendanceGrade("user", "teacher", [7], 8)).toBe(false);
    expect(canAccessAttendanceGrade("admin", null, [], 8)).toBe(true);
  });

  it("allows attendance capture only to an allocated class teacher or administrator", () => {
    expect(canCaptureAttendance("user", "class_teacher", [7], 7)).toBe(true);
    expect(canCaptureAttendance("user", "class_teacher", [7], 8)).toBe(false);
    expect(canCaptureAttendance("user", "teacher", [7], 7)).toBe(false);
    expect(canCaptureAttendance("admin", null, [], 8)).toBe(true);
    expect(canCaptureAttendance("user", "super_admin", [], 8)).toBe(true);
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


  it("rejects timetable entries without an active learning-area allocation", () => {
    const entries = [{ gradeId: 7, subjectId: 3, teacherUserId: 12 }, { gradeId: 7, subjectId: 4, teacherUserId: 12 }];
    const allocations = [{ gradeId: 7, subjectId: 3, teacherUserId: 12, status: "active", allocationType: "learning_area" }];
    expect(unallocatedTimetableEntries(entries, allocations)).toEqual([{ gradeId: 7, subjectId: 4, teacherUserId: 12 }]);
  });

  it("shows only timetable rows owned by the active subject allocation", () => {
    const entries = [
      { id: 1, schoolId: 1, gradeId: 8, subjectId: 1, teacherUserId: 1 },
      { id: 2, schoolId: 1, gradeId: 8, subjectId: 1, teacherUserId: 42 },
    ];
    const allocations = [{ schoolId: 1, gradeId: 8, subjectId: 1, teacherUserId: 42, status: "active", allocationType: "learning_area" }];
    expect(timetableEntriesAlignedWithAllocations(entries, allocations).map(entry => entry.id)).toEqual([2]);
  });

  it("reports missing teacher allocations separately from under-scheduled lessons", () => {
    const requirements = [
      { gradeId: 7, gradeName: "Grade 7", gradeStream: "Blue", subjectId: 2, subjectName: "English", subjectCode: "ENG", periodsPerWeek: 5 },
      { gradeId: 7, gradeName: "Grade 7", gradeStream: "Blue", subjectId: 3, subjectName: "Mathematics", subjectCode: "MAT", periodsPerWeek: 5 },
    ];
    const allocations = [{ schoolId: 1, gradeId: 7, subjectId: 2, teacherUserId: 12, displayName: "Sarah Anupi", teacherCode: 4, status: "active", allocationType: "learning_area" }];
    const entries = [{ id: 1, schoolId: 1, gradeId: 7, subjectId: 2, teacherUserId: 12 }];
    const rows = buildTimetableAuditRows(requirements, allocations, entries);
    expect(rows[0]).toMatchObject({ expectedLessons: 5, scheduledLessons: 1, unplacedLessons: 4, missingTeacherAllocation: false, status: "under_scheduled" });
    expect(rows[1]).toMatchObject({ expectedLessons: 5, scheduledLessons: 0, unplacedLessons: 5, missingTeacherAllocation: true, status: "missing_teacher" });
  });

  it("resolves legacy combined learner class labels only when unambiguous", () => {
    const classes = [{ id: 2, name: "Grade 7", stream: "Green" }, { id: 1, name: "Grade 8", stream: "Blue" }, { id: 90001, name: "Grade 9", stream: "Red" }];
    expect(resolveImportGrade(classes, "GRADE 7 Blue", "")?.stream).toBe("Green");
    expect(resolveImportGrade(classes, "GRADE 7", "Blue")?.stream).toBe("Green");
    expect(resolveImportGrade(classes, "Grade 7", "Green")?.name).toBe("Grade 7");
    expect(resolveImportGrade(classes, "Grade 7 Blue", "Other")?.stream).toBe("Green");
    expect(resolveImportGrade([{ id: 1, name: "Grade 7", stream: "Green" }, { id: 2, name: "Grade 7", stream: "Red" }], "Grade 7 Blue", "")).toBeUndefined();
  });

  it("treats active teacher allocations as the authoritative conflict boundary", () => {
    const activeEnglish = { gradeId: 2, subjectId: 2, allocationType: "learning_area" as const, status: "active" as const, startsOn: null, endsOn: null };
    expect(allocationContextConflict({ gradeId: 2, subjectId: 2, allocationType: "learning_area", startsOn: "2026-05-01", endsOn: "2026-05-31" }, activeEnglish)).toBe(true);
    expect(allocationContextConflict({ gradeId: 2, subjectId: 2, allocationType: "learning_area", startsOn: "2027-01-01", endsOn: "2027-01-31" }, { ...activeEnglish, startsOn: "2026-01-01", endsOn: "2026-12-31" })).toBe(true);
    expect(allocationContextConflict({ gradeId: 2, subjectId: 0, allocationType: "class_teacher" }, { ...activeEnglish, allocationType: "class_teacher" })).toBe(true);
    expect(allocationContextConflict({ gradeId: 2, subjectId: 2, allocationType: "learning_area" }, { ...activeEnglish, status: "inactive" })).toBe(false);
  });
});
