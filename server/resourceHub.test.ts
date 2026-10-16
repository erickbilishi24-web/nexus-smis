import { afterEach, describe, expect, it } from "vitest";
import { canManageResourceHub, validateResourceUrl } from "./resourceHub";

const baseUser = { role: "admin" as const, resourceHubManage: true, openId: "admin-open-id" };

describe("Resource Hub URL validation", () => {
  it("accepts HTTPS destinations and normalizes whitespace", () => {
    expect(validateResourceUrl("  https://school.example/resources  ")).toBe("https://school.example/resources");
  });

  it("rejects unsafe schemes and incomplete destinations", () => {
    expect(() => validateResourceUrl("javascript:alert(1)")).toThrow(/HTTPS/);
    expect(() => validateResourceUrl("data:text/html,<h1>unsafe</h1>")).toThrow(/HTTPS/);
    expect(() => validateResourceUrl("school.example")).toThrow(/complete destination URL/);
  });

  it("requires an explicit allow flag for HTTP", () => {
    expect(() => validateResourceUrl("http://intranet.example")).toThrow(/HTTP links require explicit authorization/);
    expect(validateResourceUrl("http://intranet.example", true)).toBe("http://intranet.example/");
  });

  it("rejects credentials embedded in a destination", () => {
    expect(() => validateResourceUrl("https://user:password@example.com")).toThrow(/embedded credentials/);
  });
});

describe("Resource Hub authorization", () => {
  afterEach(() => {
    delete process.env.OWNER_OPEN_ID;
  });

  it("allows an explicitly granted admin", () => {
    expect(canManageResourceHub(baseUser)).toBe(true);
  });

  it("does not allow an ordinary user even when a flag is malformed", () => {
    expect(canManageResourceHub({ role: "user", resourceHubManage: true, openId: "user" })).toBe(false);
  });

  it("allows the configured owner as the default Super Admin", () => {
    process.env.OWNER_OPEN_ID = "owner-open-id";
    expect(canManageResourceHub({ role: "admin", resourceHubManage: false, openId: "owner-open-id" })).toBe(true);
  });
});
