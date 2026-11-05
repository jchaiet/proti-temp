import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMock,
  getDocument,
  createIfNotExists,
  commit,
  patch,
  setIfMissing,
  inc,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getDocument: vi.fn(),
  createIfNotExists: vi.fn(),
  commit: vi.fn(),
  patch: vi.fn(),
  setIfMissing: vi.fn(),
  inc: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    withConfig: () => ({
      fetch: fetchMock,
      getDocument,
      createIfNotExists,
      patch,
    }),
  },
}));

import { GET, POST } from "./route";
import { POLL_COOKIE_NAME } from "@/lib/polls/visitor";

const data = {
  siteId: "site-123",
  locale: "en-us",
  pollKey: "helpful",
  optionId: "yes",
};
const secret = "a-test-server-secret-longer-than-thirty-two-characters";

function post(
  value: unknown = data,
  cookie = "",
  origin = "https://example.com",
) {
  return new Request("https://example.com/api/poll/vote", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(value),
  });
}

function get(cookie = "", value = data) {
  const params = new URLSearchParams(value);
  return new Request(`https://example.com/api/poll/vote?${params}`, {
    headers: cookie ? { cookie } : {},
  });
}

function responseCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  expect(cookie.startsWith(`${POLL_COOKIE_NAME}=`)).toBe(true);
  return cookie;
}

describe("cookie-only polls: mutation and hydration", () => {
  beforeEach(() => {
    vi.stubEnv("POLL_VISITOR_SECRET", secret);
    vi.stubEnv("SANITY_API_WRITE_TOKEN", "test-write-token");
    vi.stubEnv("POLL_ALLOWED_ORIGINS", "https://example.com");
    fetchMock.mockReset().mockResolvedValue(true);
    getDocument.mockReset().mockResolvedValue({ votes: { yes: 4, no: 2 } });
    createIfNotExists.mockReset().mockResolvedValue({});
    commit.mockReset().mockResolvedValue({ votes: { yes: 5, no: 2 } });
    patch.mockReset().mockReturnValue({ setIfMissing, inc });
    setIfMissing.mockReset().mockReturnValue({ inc });
    inc.mockReset().mockReturnValue({ commit });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns a vote tally and sets the cookie only after a confirmed increment", async () => {
    const response = await POST(post());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      votes: { yes: 5, no: 2 },
      alreadyVoted: false,
    });
    expect(responseCookie(response)).toContain(`${POLL_COOKIE_NAME}=`);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(setIfMissing).toHaveBeenCalledWith({ "votes['yes']": 0 });
    expect(inc).toHaveBeenCalledWith({ "votes['yes']": 1 });
    expect(commit).toHaveBeenCalledWith({ returnDocuments: true });
  });

  it("restores already-voted and tally after refresh, without another mutation", async () => {
    const first = await POST(post());
    const cookie = responseCookie(first);
    const hydrated = await GET(get(cookie));
    expect(hydrated.status).toBe(200);
    expect(await hydrated.json()).toEqual({
      votes: { yes: 4, no: 2 },
      alreadyVoted: true,
    });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("allows new browsers to read totals without marking them as voted", async () => {
    const response = await GET(get());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      votes: { yes: 4, no: 2 },
      alreadyVoted: false,
    });
    expect(commit).not.toHaveBeenCalled();
  });

  it("returns the current totals on repeat vote and doesn't increment again", async () => {
    const first = await POST(post());
    const response = await POST(post(data, responseCookie(first)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      votes: { yes: 4, no: 2 },
      alreadyVoted: true,
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("does not silently turn missing Sanity totals into zero after a prior vote", async () => {
    const first = await POST(post());
    const cookie = responseCookie(first);
    getDocument.mockResolvedValue(null);
    const refreshed = await GET(get(cookie));
    const repeated = await POST(post(data, cookie));
    expect(refreshed.status).toBe(503);
    expect(repeated.status).toBe(503);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("rejects empty/corrupt result totals if a prior cookie exists", async () => {
    const first = await POST(post());
    const cookie = responseCookie(first);
    getDocument.mockResolvedValue({ votes: {} });
    expect((await GET(get(cookie))).status).toBe(503);
    expect((await POST(post(data, cookie))).status).toBe(503);
  });

  it("does not issue a cookie if the mutation response has no incremented count", async () => {
    commit.mockResolvedValue({ votes: {} });
    const response = await POST(post());
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("accepts digit-prefixed option IDs through JSONMatch bracket paths", async () => {
    commit.mockResolvedValue({ votes: { "123option": 1 } });
    const response = await POST(post({ ...data, optionId: "123option" }));
    expect(response.status).toBe(200);
    expect(inc).toHaveBeenCalledWith({ "votes['123option']": 1 });
  });

  it("supports a brand-new poll with no stored result and no cookie", async () => {
    getDocument.mockResolvedValue(null);
    const response = await GET(get());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ votes: {}, alreadyVoted: false });
  });

  it("rejects invalid/unpublished polls and malformed requests", async () => {
    fetchMock.mockResolvedValueOnce(false);
    expect((await GET(get())).status).toBe(404);
    fetchMock.mockResolvedValueOnce(false);
    expect((await POST(post())).status).toBe(404);
    expect(
      (await GET(new Request("https://example.com/api/poll/vote?siteId=x")))
        .status,
    ).toBe(400);
    expect((await POST(post(data, "", "https://evil.test"))).status).toBe(403);
    expect((await POST(post({ ...data, optionId: "not.valid" }))).status).toBe(
      400,
    );
    expect(commit).not.toHaveBeenCalled();
  });

  it("continues requiring the signing secret and write token, without Redis", async () => {
    vi.stubEnv("POLL_UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("POLL_UPSTASH_REDIS_REST_TOKEN", "");
    expect((await POST(post())).status).toBe(200);
    vi.stubEnv("POLL_VISITOR_SECRET", "short");
    expect((await GET(get())).status).toBe(503);
    vi.stubEnv("POLL_VISITOR_SECRET", secret);
    vi.stubEnv("SANITY_API_WRITE_TOKEN", "");
    expect((await POST(post())).status).toBe(503);
  });
});
