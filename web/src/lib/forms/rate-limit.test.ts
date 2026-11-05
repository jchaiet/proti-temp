import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkFormRateLimit, getFormRateLimitClientIp } from "./rate-limit";

const request = (headers: Record<string, string> = {}) =>
  new Request("https://proti.test/api/forms/submit", { headers });

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("FORM_UPSTASH_REDIS_REST_URL", "https://redis.example.test");
  vi.stubEnv("FORM_UPSTASH_REDIS_REST_TOKEN", "test-redis-token");
  vi.stubEnv("FORM_RATE_LIMIT_SALT", "a".repeat(32));
  vi.stubEnv("FORM_TRUST_PROXY_HEADERS", "false");
  vi.stubEnv("FORM_CLIENT_IP_HEADER", "x-forwarded-for");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("form rate limit IP attribution", () => {
  it("ignores spoofable forwarded IPs unless an operator enables trusted-proxy mode", () => {
    expect(
      getFormRateLimitClientIp(request({ "x-forwarded-for": "8.8.8.8" })),
    ).toBeNull();
  });

  it("requires a valid client IP and only reads the configured proxy header", () => {
    vi.stubEnv("FORM_TRUST_PROXY_HEADERS", "true");
    expect(
      getFormRateLimitClientIp(request({ "x-forwarded-for": "not-an-ip" })),
    ).toBeNull();
    expect(
      getFormRateLimitClientIp(
        request({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" }),
      ),
    ).toBe("8.8.8.8");
    vi.stubEnv("FORM_CLIENT_IP_HEADER", "x-real-ip");
    expect(
      getFormRateLimitClientIp(
        request({ "x-real-ip": "2001:db8::1", "x-forwarded-for": "1.1.1.1" }),
      ),
    ).toBe("2001:db8::1");
  });

  it("fails closed without a trusted proxy even when Redis is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await checkFormRateLimit(
        request({ "x-forwarded-for": "8.8.8.8" }),
        "submit",
      ),
    ).toBe("unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hashes the address and counts requests atomically in Redis", async () => {
    vi.stubEnv("FORM_TRUST_PROXY_HEADERS", "true");
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ result: 5 }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await checkFormRateLimit(
        request({ "x-forwarded-for": "8.8.8.8" }),
        "submit",
      ),
    ).toBe("allowed");
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.body).toContain("EVAL");
    expect(options.body).not.toContain("8.8.8.8");
    expect(options.redirect).toBe("error");
  });

  it("rejects requests beyond the limit and fails closed when Redis is unavailable", async () => {
    vi.stubEnv("FORM_TRUST_PROXY_HEADERS", "true");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ result: 6 }) }),
    );
    expect(
      await checkFormRateLimit(
        request({ "x-forwarded-for": "8.8.8.8" }),
        "submit",
      ),
    ).toBe("limited");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
    expect(
      await checkFormRateLimit(
        request({ "x-forwarded-for": "8.8.8.8" }),
        "submit",
      ),
    ).toBe("unavailable");
  });

  it("rejects a weak production salt", async () => {
    vi.stubEnv("FORM_RATE_LIMIT_SALT", "short");
    vi.stubEnv("FORM_TRUST_PROXY_HEADERS", "true");
    expect(
      await checkFormRateLimit(
        request({ "x-forwarded-for": "8.8.8.8" }),
        "submit",
      ),
    ).toBe("unavailable");
  });
});
