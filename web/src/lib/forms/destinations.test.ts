import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveFormWebhookDestination } from "./destinations";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("FORM_WEBHOOK_URL", "https://default.example.test/hook");
  vi.stubEnv("FORM_WEBHOOK_SECRET", "default-secret");
  vi.stubEnv("FORM_WEBHOOK_DESTINATIONS", "");
});
afterEach(() => vi.unstubAllEnvs());

const configured = {
  contact: {
    url: "https://contact.example.test/hook",
    secret: "contact-secret",
    siteIds: ["site-one"],
  },
  newsletter: {
    url: "https://newsletter.example.test/hook",
    secret: "newsletter-secret",
  },
};

describe("form webhook destination configuration", () => {
  it("keeps the existing single-webhook default for old forms", () => {
    expect(resolveFormWebhookDestination(undefined, "site-one")).toEqual({
      url: "https://default.example.test/hook",
      secret: "default-secret",
    });
    expect(resolveFormWebhookDestination("default", "site-one")).toEqual({
      url: "https://default.example.test/hook",
      secret: "default-secret",
    });
  });

  it("resolves named destinations and enforces optional site boundaries", () => {
    vi.stubEnv("FORM_WEBHOOK_DESTINATIONS", JSON.stringify(configured));
    expect(resolveFormWebhookDestination("contact", "site-one")?.url).toBe(
      "https://contact.example.test/hook",
    );
    expect(resolveFormWebhookDestination("contact", "site-two")).toBeNull();
    expect(
      resolveFormWebhookDestination("newsletter", "site-two")?.secret,
    ).toBe("newsletter-secret");
  });

  it("fails closed for unconfigured, malformed or unsafe named entries", () => {
    expect(resolveFormWebhookDestination("unknown", "site-one")).toBeNull();
    expect(resolveFormWebhookDestination("__proto__", "site-one")).toBeNull();
    vi.stubEnv("FORM_WEBHOOK_DESTINATIONS", "not-json");
    expect(resolveFormWebhookDestination("contact", "site-one")).toBeNull();
    vi.stubEnv(
      "FORM_WEBHOOK_DESTINATIONS",
      JSON.stringify({
        contact: { url: "http://internal.example.test", secret: "secret" },
        newsletter: {
          url: "https://person:pass@example.test/hook",
          secret: "secret",
        },
        quotes: { url: "https://quotes.example.test/hook", secret: "" },
      }),
    );
    expect(resolveFormWebhookDestination("contact", "site-one")).toBeNull();
    expect(resolveFormWebhookDestination("newsletter", "site-one")).toBeNull();
    expect(resolveFormWebhookDestination("quotes", "site-one")).toBeNull();
  });

  it("does not accidentally send named submissions to the default webhook", () => {
    vi.stubEnv(
      "FORM_WEBHOOK_DESTINATIONS",
      JSON.stringify({
        contact: { url: "https://contact.example.test/hook" },
      }),
    );
    expect(resolveFormWebhookDestination("contact", "site-one")).toBeNull();
    expect(resolveFormWebhookDestination("default", "site-one")).not.toBeNull();
  });
});
