import { afterEach, describe, expect, it, vi } from "vitest";
import { OFFICIAL_SENDER, OFFICIAL_SENDER_EMAIL, sendTransactionalEmail } from "./email";

describe("transactional email sender", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("always sends through the official NEXUS sender address", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.RESEND_FROM_EMAIL = "unexpected@example.com";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendTransactionalEmail({ to: "client@example.com", subject: "Test", text: "Hello" })).resolves.toBe(true);

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ from: OFFICIAL_SENDER, to: ["client@example.com"] });
    expect(JSON.parse(String(request.body)).html).toContain("NEXUS SMIS");
    expect(JSON.parse(String(request.body)).html).toContain(OFFICIAL_SENDER_EMAIL);
  });
});
