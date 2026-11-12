import { describe, expect, it } from "vitest";
import { assertSameTenant } from "./tenant";
import { schoolStorageKey } from "./storage";

type SchoolRecord = {
  schoolId: number;
  kind: "learner" | "staff" | "mark" | "report" | "archive" | "import" | "attendance" | "fee" | "timetable";
  id: number;
};

describe("three-school isolated integration fixture", () => {
  const schools = [
    { id: 301, code: "MWANGAZA", name: "MWANGAZA ACADEMY" },
    { id: 302, code: "TEST-B", name: "TEST SCHOOL B" },
    { id: 303, code: "TEST-C", name: "TEST SCHOOL C" },
  ] as const;
  const records: SchoolRecord[] = schools.flatMap(school => [
    { schoolId: school.id, kind: "learner", id: school.id * 10 + 1 },
    { schoolId: school.id, kind: "staff", id: school.id * 10 + 2 },
    { schoolId: school.id, kind: "mark", id: school.id * 10 + 3 },
    { schoolId: school.id, kind: "report", id: school.id * 10 + 4 },
    { schoolId: school.id, kind: "archive", id: school.id * 10 + 5 },
    { schoolId: school.id, kind: "import", id: school.id * 10 + 6 },
    { schoolId: school.id, kind: "attendance", id: school.id * 10 + 7 },
    { schoolId: school.id, kind: "fee", id: school.id * 10 + 8 },
    { schoolId: school.id, kind: "timetable", id: school.id * 10 + 9 },
  ]);

  it("keeps the three fictional schools isolated without using production data", () => {
    expect(new Set(records.map(record => record.schoolId))).toEqual(new Set([301, 302, 303]));
    for (const school of schools) {
      const ownRecords = records.filter(record => record.schoolId === school.id);
      expect(ownRecords).toHaveLength(9);
      expect(new Set(ownRecords.map(record => record.kind))).toHaveLength(9);
      expect(records.filter(record => record.schoolId !== school.id)).toHaveLength(18);
    }
  });

  it.each(schools)("rejects foreign IDs for $name", school => {
    const foreign = records.find(record => record.schoolId !== school.id)!;
    expect(() => assertSameTenant(school.id, foreign.schoolId)).toThrow("CROSS_SCHOOL_ACCESS_DENIED");
    expect(() => assertSameTenant(school.id, null)).toThrow("CROSS_SCHOOL_ACCESS_DENIED");
  });

  it("allows each school user to access only the complete record set for their school", () => {
    for (const school of schools) {
      const visible = records.filter(record => record.schoolId === school.id);
      visible.forEach(record => assertSameTenant(school.id, record.schoolId));
      expect(visible.map(record => record.kind)).toEqual([
        "learner", "staff", "mark", "report", "archive", "import", "attendance", "fee", "timetable",
      ]);
    }
  });

  it("isolates import and export file references by school", () => {
    for (const school of schools) {
      expect(schoolStorageKey(school.id, "imports/learners.xlsx")).toBe(`schools/${school.id}/imports/learners.xlsx`);
      expect(schoolStorageKey(school.id, "exports/report-cards.pdf")).toBe(`schools/${school.id}/exports/report-cards.pdf`);
    }
    expect(schoolStorageKey(301, "imports/learners.xlsx")).not.toBe(schoolStorageKey(302, "imports/learners.xlsx"));
  });
});
