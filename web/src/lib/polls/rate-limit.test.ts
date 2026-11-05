import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkPollRateLimit, reservePollVote } from "./rate-limit";

describe("shared poll voting gate", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    vi.stubEnv("POLL_UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("POLL_UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubEnv(
      "POLL_RATE_LIMIT_SALT",
      "a-test-salt-of-at-least-thirty-two-characters",
    );
    vi.stubEnv("POLL_TRUST_PROXY_HEADERS", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const request = () =>
    new Request("https://example.com/api/poll/vote", {
      method: "POST",
      headers: { "x-real-ip": "203.0.113.10" },
    });

  it("uses an atomic Redis increment and limits abusive clients", async () => {
    const calls: unknown[][] = [];
    globalThis.fetch = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        calls.push(JSON.parse(String(init?.body)) as unknown[]);
        return new Response(
          JSON.stringify({ result: calls.length === 1 ? 25 : 26 }),
          { status: 200 },
        );
      },
    ) as typeof fetch;
    expect(await checkPollRateLimit(request())).toBe("allowed");
    expect(await checkPollRateLimit(request())).toBe("limited");
    expect(calls[0][0]).toBe("EVAL");
    expect(JSON.stringify(calls)).not.toContain("203.0.113.10");
  });

  it("reserves a poll once with Redis SET NX and a TTL", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const command = JSON.parse(String(init?.body)) as string[];
        expect(command[0]).toBe("SET");
        expect(command).toContain("NX");
        expect(command).toContain("EX");
        return new Response(
          JSON.stringify({ result: ++calls === 1 ? "OK" : null }),
          { status: 200 },
        );
      },
    ) as typeof fetch;
    expect(await reservePollVote("visitor", "site", "en-us", "poll")).toBe(
      "allowed",
    );
    expect(await reservePollVote("visitor", "site", "en-us", "poll")).toBe(
      "duplicate",
    );
  });

  it("permits local development without Redis, but not production", async () => {
    vi.stubEnv("POLL_UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("POLL_UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("POLL_RATE_LIMIT_SALT", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(await checkPollRateLimit(request())).toBe("allowed");
    vi.stubEnv("NODE_ENV", "production");
    expect(await checkPollRateLimit(request())).toBe("unavailable");
  });

  it("does not silently bypass a partially configured Redis setup", async () => {
    vi.stubEnv("POLL_UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(await checkPollRateLimit(request())).toBe("unavailable");
  });

  it("fails closed when proxy trust or Redis is missing", async () => {
    vi.stubEnv("POLL_TRUST_PROXY_HEADERS", "false");
    expect(await checkPollRateLimit(request())).toBe("unavailable");
    vi.stubEnv("POLL_UPSTASH_REDIS_REST_TOKEN", "");
    expect(await reservePollVote("visitor", "site", "en-us", "poll")).toBe(
      "unavailable",
    );
  });

  it("fails closed if Redis fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("timeout"));
    expect(await checkPollRateLimit(request())).toBe("unavailable");
  });
});
