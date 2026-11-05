import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPollHistoryCookie,
  getPollCookie,
  POLL_COOKIE_NAME,
  POLL_MAX_TRACKED,
  pollFingerprint,
  pollVisitorSecret,
  readPollHistory,
} from "./visitor";

afterEach(() => vi.unstubAllEnvs());

const secret = "a-test-server-secret-longer-than-thirty-two-characters";
const fingerprint = pollFingerprint("site-123", "en-us", "helpful");

describe("signed poll vote history", () => {
  it("signs a browser's accepted polls and verifies the signature", () => {
    const cookie = createPollHistoryCookie([fingerprint], secret);
    expect(readPollHistory(cookie, secret)).toEqual([fingerprint]);
    expect(
      readPollHistory(cookie, "an-entirely-different-signing-secret-123"),
    ).toEqual([]);
    expect(readPollHistory(cookie.replace("v1.", "v2."), secret)).toEqual([]);
    const last = cookie.slice(-1);
    expect(
      readPollHistory(cookie.slice(0, -1) + (last === "0" ? "1" : "0"), secret),
    ).toEqual([]);
  });

  it("binds each poll to the site and locale", () => {
    expect(pollFingerprint("site-123", "en-us", "helpful")).toBe(fingerprint);
    expect(pollFingerprint("site-123", "es-us", "helpful")).not.toBe(
      fingerprint,
    );
    expect(pollFingerprint("other-site", "en-us", "helpful")).not.toBe(
      fingerprint,
    );
    expect(pollFingerprint("site-123", "en-us", "other-poll")).not.toBe(
      fingerprint,
    );
  });

  it("ignores missing, malformed, and forged cookies", () => {
    expect(readPollHistory(null, secret)).toEqual([]);
    expect(readPollHistory("random-cookie", secret)).toEqual([]);
    expect(readPollHistory("v1.__proto__.fake", secret)).toEqual([]);
    const request = new Request("https://example.com/api/poll/vote", {
      headers: {
        cookie: `other=value; ${POLL_COOKIE_NAME}=signed-data; extra=ok`,
      },
    });
    expect(getPollCookie(request)).toBe("signed-data");
  });

  it("keeps history bounded and de-duplicates poll entries", () => {
    const ids = Array.from({ length: POLL_MAX_TRACKED + 10 }, (_, index) =>
      pollFingerprint("site", "en-us", `poll-${index}`),
    );
    const history = readPollHistory(
      createPollHistoryCookie([...ids, ids.at(-1)!], secret),
      secret,
    );
    expect(history).toHaveLength(POLL_MAX_TRACKED);
    expect(history).toContain(ids.at(-1));
    expect(history).not.toContain(ids[0]);
  });

  it("requires a server-only signing secret of at least 32 characters", () => {
    vi.stubEnv("POLL_VISITOR_SECRET", "short");
    expect(pollVisitorSecret()).toBeNull();
    vi.stubEnv("POLL_VISITOR_SECRET", secret);
    expect(pollVisitorSecret()).toBe(secret);
  });
});
