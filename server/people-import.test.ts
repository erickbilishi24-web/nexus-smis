import { describe, expect, it } from "vitest";
import { isPeopleImportUndoable, normalizeImportedStaffRole, PEOPLE_IMPORT_UNDO_WINDOW_MS } from "./smis";
import { splitPeopleImportRows } from "../shared/people-import";

describe("people import undo window", () => {
  it("allows undo within one hour and rejects older imports", () => {
    const createdAt = new Date("2026-10-12T08:00:00.000Z");
    expect(isPeopleImportUndoable(createdAt, createdAt.getTime() + PEOPLE_IMPORT_UNDO_WINDOW_MS)).toBe(true);
    expect(isPeopleImportUndoable(createdAt, createdAt.getTime() + PEOPLE_IMPORT_UNDO_WINDOW_MS + 1)).toBe(false);
  });
});

describe("people import batch performance", () => {
  it("splits a 1,200-row workbook into bounded server batches without losing order", () => {
    const rows = Array.from({ length: 1200 }, (_, index) => ({ admissionNumber: `G7-${index + 1}` }));
    const batches = splitPeopleImportRows(rows);
    expect(batches).toHaveLength(12);
    expect(batches.every(batch => batch.length <= 100)).toBe(true);
    expect(batches.flat()).toEqual(rows);
  });
});

describe("staff import role normalization", () => {
  it("accepts display labels and internal role values", () => {
    expect(normalizeImportedStaffRole("Teacher")).toBe("teacher");
    expect(normalizeImportedStaffRole("Class Teacher")).toBe("class_teacher");
    expect(normalizeImportedStaffRole("Accounts Officer")).toBe("finance");
    expect(normalizeImportedStaffRole("administrator")).toBe("admin");
    expect(normalizeImportedStaffRole("boarding-master")).toBe("boarding_master");
    expect(normalizeImportedStaffRole("unknown role")).toBe("");
  });
});
