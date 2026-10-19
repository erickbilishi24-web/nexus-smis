import { describe, expect, it } from "vitest";
import { nextGrade, nextGradeLabel } from "./academic";

describe("academic progression rules", () => {
  it("advances Grades 1 through 8 by one grade", () => {
    expect(nextGrade("Grade 1")).toBe(2);
    expect(nextGrade("Grade 8 Blue")).toBe(9);
    expect(nextGrade("G7")).toBe(8);
  });
  it("requires an approved destination beyond Grade 9", () => {
    expect(nextGrade("Grade 9")).toBeNull();
    expect(nextGrade("PP1")).toBeNull();
    expect(nextGradeLabel("PP1")).toBe("PP2");
    expect(nextGradeLabel("PP2")).toBe("Grade 1");
  });
});
