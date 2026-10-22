import { describe, expect, it } from "vitest";
import { peoplePageWindow } from "./smis";

describe("People registry pagination bounds", () => {
  it("normalizes negative pages and clamps page size", () => {
    expect(peoplePageWindow(-3, 1)).toEqual({ page: 0, pageSize: 10, offset: 0 });
    expect(peoplePageWindow(2, 500)).toEqual({ page: 2, pageSize: 100, offset: 200 });
  });

  it("calculates a stable offset", () => {
    expect(peoplePageWindow(3, 25)).toEqual({ page: 3, pageSize: 25, offset: 75 });
  });
});
