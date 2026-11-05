import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { forwardFormSubmission } from "./webhook";

const submission = {
  formKey: "contact-form",
  blockKey: "form-block",
  siteId: "site-one",
  locale: "us-en",
  fields: { name: "Example Tester", email: "test@example.com" },
  submittedAt: "2026-10-29T12:00:00.000Z",
};

beforeEach(() => vi.stubEnv("NODE_ENV", "test"));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("webhook forwarding", () => {
  it("uses the selected URL and its own signing secret", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await forwardFormSubmission(submission, {
        url: "https://contact.example.test/receive",
        secret: "contact-secret",
      }),
    ).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    const body = JSON.stringify(submission);
    expect(url).toBe("https://contact.example.test/receive");
    expect(options.body).toBe(body);
    expect(options.headers["X-Proti-Signature"]).toBe(
      `sha256=${createHmac("sha256", "contact-secret").update(body).digest("hex")}`,
    );
    expect(options.redirect).toBe("error");
    expect(options.cache).toBe("no-store");
  });

  it("rejects delivery errors without logging or returning form values", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await forwardFormSubmission(submission, {
        url: "https://newsletter.example.test/hook",
        secret: "secret",
      }),
    ).toBe("unavailable");
  });
});
