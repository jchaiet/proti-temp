import { afterEach, describe, expect, it, vi } from "vitest";

import {
  parsePollVote,
  pollOriginAllowed,
  readPollVoteBody,
} from "./validation";

const valid = {
  siteId: "site-123",
  locale: "en-us",
  pollKey: "helpfulness",
  optionId: "yes_1",
};

afterEach(() => vi.unstubAllEnvs());

describe("poll vote validation", () => {
  it("accepts ordinary published poll identifiers", () => {
    expect(parsePollVote(valid)).toEqual(valid);
  });

  it("rejects malformed, injected, or unexpected fields", () => {
    expect(parsePollVote(null)).toBeNull();
    expect(parsePollVote([])).toBeNull();
    expect(parsePollVote({ ...valid, optionId: "yes.no" })).toBeNull();
    expect(parsePollVote({ ...valid, pollKey: "../../other" })).toBeNull();
    expect(parsePollVote({ ...valid, siteId: { x: 1 } })).toBeNull();
    expect(parsePollVote({ ...valid, unused: 1 })).toBeNull();
    expect(parsePollVote({ ...valid, optionId: "a".repeat(129) })).toBeNull();
  });

  it("blocks oversized streaming JSON even without Content-Length", async () => {
    const req = new Request("http://localhost/api/poll/vote", {
      method: "POST",
      body: "x".repeat(3000),
    });
    await expect(readPollVoteBody(req)).resolves.toEqual({ status: "large" });
  });

  it("rejects malformed JSON", async () => {
    const req = new Request("http://localhost/api/poll/vote", {
      method: "POST",
      body: "{bad}",
    });
    await expect(readPollVoteBody(req)).resolves.toEqual({ status: "invalid" });
  });

  it("checks the exact allowlisted origin", () => {
    vi.stubEnv(
      "POLL_ALLOWED_ORIGINS",
      "https://example.com,https://preview.example.com",
    );
    const request = (origin: string) =>
      new Request("https://example.com/api/poll/vote", {
        method: "POST",
        headers: { origin },
      });
    expect(pollOriginAllowed(request("https://example.com"))).toBe(true);
    expect(
      pollOriginAllowed(request("https://example.com.attacker.test")),
    ).toBe(false);
    expect(pollOriginAllowed(request("https://preview.example.com"))).toBe(
      true,
    );
  });
});
