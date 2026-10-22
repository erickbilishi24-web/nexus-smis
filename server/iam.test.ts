import { describe, expect, it } from "vitest";
import { isIamSessionExpired, shouldLockIamAccount } from "./iam";

describe("IAM account lockout policy", () => {
  it("protects super-admin accounts from automatic lockout", () => {
    expect(shouldLockIamAccount(true, 5)).toBe(false);
    expect(shouldLockIamAccount(true, 50)).toBe(false);
  });

  it("retains the five-attempt lockout for ordinary accounts", () => {
    expect(shouldLockIamAccount(false, 4)).toBe(false);
    expect(shouldLockIamAccount(false, 5)).toBe(true);
  });

  it("expires sessions at or after their expiry time", () => {
    const expiry = new Date("2026-01-01T00:00:00.000Z");
    expect(isIamSessionExpired(expiry, new Date("2025-12-31T23:59:59.999Z"))).toBe(false);
    expect(isIamSessionExpired(expiry, expiry)).toBe(true);
  });
});
