import { describe, expect, it } from "vitest";
import { assertSameTenant } from "./tenant";
import { schoolStorageKey } from "./storage";

describe("tenant boundary helpers", () => {
  it("accepts only records in the actor school", () => {
    expect(() => assertSameTenant(1, 1)).not.toThrow();
    expect(() => assertSameTenant(1, 2)).toThrow("CROSS_SCHOOL_ACCESS_DENIED");
    expect(() => assertSameTenant(1, null)).toThrow("CROSS_SCHOOL_ACCESS_DENIED");
  });

  it("places school files under an isolated prefix", () => {
    expect(schoolStorageKey(7, "/logos/school.png")).toBe("schools/7/logos/school.png");
    expect(() => schoolStorageKey(0, "logo.png")).toThrow("SCHOOL_ID_REQUIRED");
    expect(() => schoolStorageKey(7, "../private.txt")).toThrow("STORAGE_KEY_INVALID");
  });
});
