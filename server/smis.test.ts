import { describe, expect, it } from "vitest";
import { areLanguageSubjectsAdjacent, allocationContextConflict, assertScore, buildTimetableAuditRows, buildTimetableValidationReport, hasAdjacentTeacherLesson, timetableEntriesAlignedWithAllocations, unallocatedTimetableEntries, canAccessAttendanceGrade, canCaptureAttendance, cbcLevel, isAttendanceAdmin, isPreNoonTimetableSubject, resolveImportGrade, timetableConflicts } from "./smis";
import { swapTimetableDraftEntries, type TimetableDraftEntry } from "../shared/timetable";

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

  it("classifies core subjects that must be scheduled before noon", () => {
    expect(["English", "CBC-KISWAHILI", "Mathematics", "Physical Education", "Physical and Health Education"].every(isPreNoonTimetableSubject)).toBe(true);
    expect(isPreNoonTimetableSubject("Agriculture")).toBe(false);
  });

  it("detects a teacher code repeated in an adjacent class slot", () => {
    const slots = new Map([
      ["7:1:2", 3],
      ["7:1:4", 5],
    ]);
    expect(hasAdjacentTeacherLesson(slots, 7, 3, 1, 3)).toBe(true);
    expect(hasAdjacentTeacherLesson(slots, 7, 4, 1, 3)).toBe(false);
    expect(hasAdjacentTeacherLesson(slots, 7, 5, 1, 3)).toBe(true);
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

  it("builds a distinct hard-conflict and soft-warning timetable validation report", () => {
    const requirements = [
      { gradeId: 7, gradeName: "Grade 7", gradeStream: "Blue", subjectId: 2, subjectName: "CBC-KISWAHILI", subjectCode: "KISW", periodsPerWeek: 2 },
      { gradeId: 7, gradeName: "Grade 7", gradeStream: "Blue", subjectId: 3, subjectName: "Mathematics", subjectCode: "MAT", periodsPerWeek: 1 },
    ];
    const allocations = [
      { schoolId: 1, gradeId: 7, subjectId: 2, teacherUserId: 12, displayName: "Sarah Anupi", teacherCode: 4, status: "active", allocationType: "learning_area", activeEmployment: true },
      { schoolId: 1, gradeId: 7, subjectId: 3, teacherUserId: 13, displayName: "John Andera", teacherCode: 1, status: "active", allocationType: "learning_area", activeEmployment: true },
    ];
    const entries = [
      { id: 1, schoolId: 1, gradeId: 7, subjectId: 2, teacherUserId: 12, dayOfWeek: 1, period: 1 },
      { id: 2, schoolId: 1, gradeId: 7, subjectId: 3, teacherUserId: 13, dayOfWeek: 1, period: 1 },
      { id: 3, schoolId: 1, gradeId: 7, subjectId: 2, teacherUserId: 12, dayOfWeek: 1, period: 2 },
    ];
    const report = buildTimetableValidationReport(requirements, allocations, entries);
    expect(report.hardConflicts.some(item => item.type === "grade_clash")).toBe(true);
    expect(report.softWarnings).toHaveLength(1);
    expect(report.morningPlacement.find(item => item.subject === "Kiswahili")).toMatchObject({ morning: 2, afternoon: 0 });
    expect(report.teacherWorkload).toEqual(expect.arrayContaining([
      expect.objectContaining({ teacherUserId: 12, teacherName: "Sarah Anupi", teacherCode: 4, weeklyLessons: 2 }),
      expect.objectContaining({ teacherUserId: 13, teacherName: "John Andera", teacherCode: 1, weeklyLessons: 1 }),
    ]));
    expect(report.valid).toBe(false);
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


describe("language adjacency timetable rule", () => {
  it("keeps English and Kiswahili apart within the same class day", () => {
    const subjects = new Map([[1, "English"], [2, "Kiswahili"]]);
    const slots = new Map([["7:1:2", "2"]]);
    expect(areLanguageSubjectsAdjacent(slots, subjects, 7, 1, 1, 1)).toBe(true);
    expect(areLanguageSubjectsAdjacent(slots, subjects, 7, 1, 1, 3)).toBe(false);
  });
});

describe("manual timetable drag-and-drop draft swaps", () => {
  const first: TimetableDraftEntry = { sourceId: 11, gradeId: 7, subjectId: 2, teacherUserId: 12, dayOfWeek: 1, period: 1, room: null, isForcePlaced: true };
  const second: TimetableDraftEntry = { sourceId: 12, gradeId: 7, subjectId: 3, teacherUserId: 13, dayOfWeek: 1, period: 2, room: null, isForcePlaced: false };

  it("swaps two lessons while preserving their force-placement markers", () => {
    const result = swapTimetableDraftEntries({ "7:1:1": first, "7:1:2": second }, "7:1:1", "7:1:2", 7, 1, 2);
    expect(result["7:1:1"]).toMatchObject({ subjectId: 3, teacherUserId: 13, isForcePlaced: false });
    expect(result["7:1:2"]).toMatchObject({ subjectId: 2, teacherUserId: 12, isForcePlaced: true });
  });

  it("moves a lesson into an empty slot without discarding its metadata", () => {
    const result = swapTimetableDraftEntries({ "7:1:1": first }, "7:1:1", "7:1:3", 7, 1, 3);
    expect(result["7:1:1"]).toBeUndefined();
    expect(result["7:1:3"]).toMatchObject({ subjectId: 2, dayOfWeek: 1, period: 3, isForcePlaced: true });
  });
});
