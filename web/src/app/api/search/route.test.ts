import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/cms/resolvers/search", () => ({ searchContent: vi.fn() }));
vi.mock("@/sanity/queries/site", () => ({ resolveSiteByHost: vi.fn() }));

import { searchContent } from "@/cms/resolvers/search";
import { resolveSiteByHost } from "@/sanity/queries/site";
import { GET } from "./route";

const search = vi.mocked(searchContent);
const resolveSite = vi.mocked(resolveSiteByHost);

function request(searchParams: string): NextRequest {
  return new NextRequest(`https://proti.test/api/search?${searchParams}`, {
    headers: { host: "proti.test" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveSite.mockResolvedValue({
    _id: "site-1",
    defaultLocale: "en-us",
    locales: [{ code: "en-us" }],
  } as Awaited<ReturnType<typeof resolveSiteByHost>>);
  search.mockResolvedValue({
    query: "",
    locale: "en-us",
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
    sort: "relevance",
    filters: {
      types: ["page", "blog"],
      taxonomy: [],
      taxonomyMatch: "any",
    },
    facets: { types: [], taxonomy: [] },
    results: [],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("public search input limits", () => {
  it("rejects queries longer than 200 characters", async () => {
    expect((await GET(request(`q=${"a".repeat(201)}`))).status).toBe(400);
    expect(search).not.toHaveBeenCalled();
  });

  it("rejects large page numbers before running GROQ", async () => {
    expect((await GET(request("page=501"))).status).toBe(400);
    expect(search).not.toHaveBeenCalled();
  });

  it("rejects excessive taxonomy filters", async () => {
    const query = Array.from({ length: 26 }, (_, i) => `taxonomy=id-${i}`).join(
      "&",
    );
    expect((await GET(request(query))).status).toBe(400);
    expect(search).not.toHaveBeenCalled();
  });

  it("rejects an oversized querystring", async () => {
    expect((await GET(request(`unrelated=${"a".repeat(4100)}`))).status).toBe(
      414,
    );
    expect(resolveSite).not.toHaveBeenCalled();
  });

  it("preserves valid search and existing page-size bounds", async () => {
    expect((await GET(request("q=health&page=500&pageSize=500"))).status).toBe(
      200,
    );
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "health",
        page: 500,
        pageSize: 50,
      }),
    );
  });
});
