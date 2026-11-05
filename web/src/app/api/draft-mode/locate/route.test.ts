import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { draftModeMock, sanityFetchMock, resolvePageSegmentsByIdMock } =
  vi.hoisted(() => ({
    draftModeMock: vi.fn(),
    sanityFetchMock: vi.fn(),
    resolvePageSegmentsByIdMock: vi.fn(),
  }));

vi.mock("next/headers", () => ({ draftMode: draftModeMock }));
vi.mock("@/sanity/fetch", () => ({ sanityFetch: sanityFetchMock }));
vi.mock("@/sanity/queries/page", () => ({
  resolvePageSegmentsById: resolvePageSegmentsByIdMock,
}));

import { GET } from "./route";

const origin = "https://example.com";

function request(params: Record<string, string> = {}) {
  const url = new URL("/api/draft-mode/locate", origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("GET /api/draft-mode/locate", () => {
  beforeEach(() => {
    draftModeMock.mockReset().mockResolvedValue({ isEnabled: true });
    sanityFetchMock.mockReset();
    resolvePageSegmentsByIdMock.mockReset();
  });

  it("rejects requests without an active Draft Mode session", async () => {
    draftModeMock.mockResolvedValue({ isEnabled: false });

    const response = await GET(request({ type: "author", id: "author-1" }));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(sanityFetchMock).not.toHaveBeenCalled();
  });

  it("rejects requests missing a type or id", async () => {
    expect((await GET(request({ type: "author" }))).status).toBe(400);
    expect((await GET(request({ id: "author-1" }))).status).toBe(400);
    expect(sanityFetchMock).not.toHaveBeenCalled();
  });

  it("redirects a valid preview to an on-site localized author route", async () => {
    sanityFetchMock.mockResolvedValue({
      _id: "author-1",
      _type: "author",
      slug: "alex",
      defaultLocale: "en-us",
    });

    const response = await GET(
      request({ type: "author", id: "author-1", locale: "es-us" }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/es-us/authors/alex`,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each(["//evil.test", "/evil.test", "\\evil.test", "es-us/../"])(
    "rejects unsafe locale %s before fetching CMS content",
    async (locale) => {
      const response = await GET(
        request({ type: "author", id: "author-1", locale }),
      );

      expect(response.status).toBe(400);
      expect(sanityFetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects a CMS slug that would produce an external redirect", async () => {
    sanityFetchMock.mockResolvedValue({
      _id: "page-1",
      _type: "page",
      locale: "en-us",
      defaultLocale: "en-us",
    });
    resolvePageSegmentsByIdMock.mockResolvedValue(["/evil.test"]);

    const response = await GET(request({ type: "page", id: "page-1" }));

    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("continues to use the homepage fallback for missing documents", async () => {
    sanityFetchMock.mockResolvedValue(null);

    const response = await GET(
      request({ type: "author", id: "missing-author" }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/`);
  });
});
