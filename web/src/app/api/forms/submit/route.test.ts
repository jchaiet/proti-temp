import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/forms/published-form", () => ({ findPublishedForm: vi.fn() }));
vi.mock("@/lib/forms/webhook", () => ({ forwardFormSubmission: vi.fn() }));

import { findPublishedForm } from "@/lib/forms/published-form";
import { forwardFormSubmission } from "@/lib/forms/webhook";
import { POST } from "./route";

const find = vi.mocked(findPublishedForm);
const forward = vi.mocked(forwardFormSubmission);
const payload = {
  formKey: "contact",
  blockKey: "key-123",
  siteId: "site-1",
  locale: "en-us",
  fields: { email: "person@example.com" },
  honeypot: "",
};

function request(
  body: unknown = payload,
  origin = "https://proti.test",
  target = "https://proti.test/api/forms/submit",
) {
  return new Request(target, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("FORM_ALLOWED_ORIGINS", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_URL", "");
  vi.stubEnv("VERCEL_BRANCH_URL", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("FORM_WEBHOOK_URL", "https://forms.example.test/receive");
  vi.stubEnv("FORM_WEBHOOK_SECRET", "test-secret");
  vi.stubEnv("FORM_WEBHOOK_DESTINATIONS", "");
  find.mockResolvedValue({
    _key: "key-123",
    fields: [
      { _type: "formInputField", name: "email", required: true, type: "email" },
    ],
  });
  forward.mockResolvedValue("ok");
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/forms/submit", () => {
  it("forwards only fields validated against the published form", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(find).toHaveBeenCalledWith({
      formKey: "contact",
      blockKey: "key-123",
      siteId: "site-1",
      locale: "en-us",
    });
    expect(forward).toHaveBeenCalledWith(
      expect.objectContaining({ fields: payload.fields, formKey: "contact" }),
      { url: "https://forms.example.test/receive", secret: "test-secret" },
    );
    expect(JSON.stringify(forward.mock.calls[0][0])).not.toContain("honeypot");
  });

  it("allows explicit production origins and fails closed without configuration", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(request())).status).toBe(403);
    expect(find).not.toHaveBeenCalled();

    vi.stubEnv("FORM_ALLOWED_ORIGINS", "https://proti.test");
    expect((await POST(request())).status).toBe(200);
  });

  it("accepts the production deployment domain supplied by Vercel", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "proti-demo-web.vercel.app");

    expect(
      (await POST(request(payload, "https://proti-demo-web.vercel.app")))
        .status,
    ).toBe(200);
  });

  it("accepts an exact Vercel preview URL but not an unrelated preview", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "proti-git-feature-team.vercel.app");

    expect(
      (
        await POST(
          request(payload, "https://proti-git-feature-team.vercel.app"),
        )
      ).status,
    ).toBe(200);
    expect(
      (await POST(request(payload, "https://some-other-team.vercel.app")))
        .status,
    ).toBe(403);
  });

  it("rejects misleading JSON content types", async () => {
    const bad = new Request("https://proti.test/api/forms/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/jsonp",
        Origin: "https://proti.test",
      },
      body: JSON.stringify(payload),
    });
    expect((await POST(bad)).status).toBe(415);
    expect(forward).not.toHaveBeenCalled();
  });

  it("rejects cross-origin posts", async () => {
    expect((await POST(request(payload, "https://attacker.test"))).status).toBe(
      403,
    );
    expect(find).not.toHaveBeenCalled();
  });

  it("rejects unknown field names rather than forwarding them", async () => {
    const response = await POST(
      request({ ...payload, fields: { ...payload.fields, admin: "yes" } }),
    );
    expect(response.status).toBe(400);
    expect(forward).not.toHaveBeenCalled();
  });

  it("rejects missing published forms", async () => {
    find.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(404);
    expect(forward).not.toHaveBeenCalled();
  });

  it("silently discards honeypot submissions without calling Sanity or the webhook", async () => {
    const response = await POST(
      request({ ...payload, honeypot: "spam.example" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(find).not.toHaveBeenCalled();
    expect(forward).not.toHaveBeenCalled();
  });

  it("rejects a malformed honeypot", async () => {
    expect((await POST(request({ ...payload, honeypot: ["x"] }))).status).toBe(
      400,
    );
    expect(forward).not.toHaveBeenCalled();
  });

  it("routes to a named destination selected in the published Sanity block", async () => {
    vi.stubEnv(
      "FORM_WEBHOOK_DESTINATIONS",
      JSON.stringify({
        contact: {
          url: "https://contact.example.test/receive",
          secret: "contact-secret",
          siteIds: ["site-1"],
        },
      }),
    );
    find.mockResolvedValue({
      _key: "key-123",
      webhookDestination: "contact",
      fields: [
        {
          _type: "formInputField",
          name: "email",
          type: "email",
          required: true,
        },
      ],
    });

    expect(
      (await POST(request({ ...payload, webhookDestination: "default" })))
        .status,
    ).toBe(200);
    expect(forward).toHaveBeenCalledWith(
      expect.objectContaining({ formKey: "contact", fields: payload.fields }),
      { url: "https://contact.example.test/receive", secret: "contact-secret" },
    );
  });

  it("rejects missing or unauthorized named destinations without falling back to default", async () => {
    find.mockResolvedValue({
      _key: "key-123",
      webhookDestination: "quotes",
      fields: [
        {
          _type: "formInputField",
          name: "email",
          type: "email",
          required: true,
        },
      ],
    });
    expect((await POST(request())).status).toBe(503);
    expect(forward).not.toHaveBeenCalled();

    vi.stubEnv(
      "FORM_WEBHOOK_DESTINATIONS",
      JSON.stringify({
        quotes: {
          url: "https://quotes.example.test/receive",
          secret: "quotes-secret",
          siteIds: ["another-site"],
        },
      }),
    );
    expect((await POST(request())).status).toBe(503);
    expect(forward).not.toHaveBeenCalled();
  });

  it("ignores a destination or URL forged in the browser request", async () => {
    expect(
      (
        await POST(
          request({
            ...payload,
            webhookDestination: "steal-data",
            webhookUrl: "https://attacker.test/collect",
          }),
        )
      ).status,
    ).toBe(200);
    expect(forward).toHaveBeenCalledWith(expect.any(Object), {
      url: "https://forms.example.test/receive",
      secret: "test-secret",
    });
  });

  it("supports older clients that do not send a honeypot", async () => {
    const legacyPayload = {
      formKey: payload.formKey,
      blockKey: payload.blockKey,
      siteId: payload.siteId,
      locale: payload.locale,
      fields: payload.fields,
    };
    expect((await POST(request(legacyPayload))).status).toBe(200);
  });

  it("does not accept a form without a webhook configuration", async () => {
    vi.stubEnv("FORM_WEBHOOK_SECRET", "");
    expect((await POST(request())).status).toBe(503);
    expect(forward).not.toHaveBeenCalled();
  });

  it("returns a generic error if the delivery provider fails", async () => {
    forward.mockResolvedValue("unavailable");
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain(
      "person@example.com",
    );
  });

  it("rejects oversized bodies", async () => {
    const response = await POST(
      request({ ...payload, fields: { email: "a".repeat(45_000) } }),
    );
    expect(response.status).toBe(413);
    expect(find).not.toHaveBeenCalled();
  });
});
