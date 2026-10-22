import { describe, expect, it } from "vitest";
import { canAssignRouteSeat, isValidOdometerTrip, isValidTransportPeriod, periodMatchesCycle } from "../shared/transport";

describe("transport billing and operating constraints", () => {
  it("recognizes monthly and term-specific transport invoice periods", () => {
    expect(isValidTransportPeriod("2026-01")).toBe(true);
    expect(isValidTransportPeriod("2026-T3")).toBe(true);
    expect(isValidTransportPeriod("2026-13")).toBe(false);
    expect(isValidTransportPeriod("2026-T4")).toBe(false);
  });

  it("does not bill a termly route on monthly cadence or vice versa", () => {
    expect(periodMatchesCycle("2026-05", "monthly")).toBe(true);
    expect(periodMatchesCycle("2026-05", "termly")).toBe(false);
    expect(periodMatchesCycle("2026-T2", "termly")).toBe(true);
    expect(periodMatchesCycle("2026-T2", "monthly")).toBe(false);
  });

  it("allows assignments up to, but not above, passenger capacity", () => {
    expect(canAssignRouteSeat(14, 13)).toBe(true);
    expect(canAssignRouteSeat(14, 14)).toBe(false);
    expect(canAssignRouteSeat(0, 0)).toBe(false);
    expect(canAssignRouteSeat(14, -1)).toBe(false);
  });

  it("rejects decreasing or non-finite odometer readings", () => {
    expect(isValidOdometerTrip(40_000, 40_018)).toBe(true);
    expect(isValidOdometerTrip(40_018, 40_018)).toBe(true);
    expect(isValidOdometerTrip(40_018, 40_000)).toBe(false);
    expect(isValidOdometerTrip(Number.NaN, 5)).toBe(false);
  });
});
