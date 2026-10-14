import { describe, expect, it } from "vitest";
import { shouldLockIamAccount } from "./iam";

describe("IAM account lockout policy", () => {
  it("protects super-admin accounts from automatic lockout", () => {
    expect(shouldLockIamAccount(true, 5)).toBe(false);
    expect(shouldLockIamAccount(true, 50)).toBe(false);
  });

  it("retains the five-attempt lockout for ordinary accounts", () => {
    expect(shouldLockIamAccount(false, 4)).toBe(false);
    expect(shouldLockIamAccount(false, 5)).toBe(true);
  });
});
