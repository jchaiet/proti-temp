import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock:
    vi.fn<
      (query: string, params?: Record<string, unknown>) => Promise<unknown>
    >(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: fetchMock,
  },
}));

import { resolvePageBySegments, resolvePageIdBySegments } from "./page";

beforeEach(() => {
  fetchMock.mockReset();
});

describe("resolvePageBySegments", () => {
  it("resolves the homepage within the requested Site and Locale", async () => {
    fetchMock.mockResolvedValueOnce({ _id: "home-es" }).mockResolvedValueOnce({
      _id: "home-es",
      title: "Inicio",
      locale: "es-us",
      isHomepage: true,
    });

    await expect(
      resolvePageBySegments("site-a", "es-us", []),
    ).resolves.toMatchObject({
      _id: "home-es",
      locale: "es-us",
      isHomepage: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      siteId: "site-a",
      locale: "es-us",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      pageId: "home-es",
      siteId: "site-a",
      locale: "es-us",
    });
  });

  it("resolves nested Pages with one route query and one full-content query", async () => {
    fetchMock
      .mockResolvedValueOnce([
        { _id: "products-es", slug: "products" },
        {
          _id: "widget-es",
          slug: "widget",
          parent: { _ref: "products-es" },
        },
      ])
      .mockResolvedValueOnce({
        _id: "widget-es",
        title: "Widget",
        slug: "widget",
        locale: "es-us",
      });

    await expect(
      resolvePageBySegments("site-a", "es-us", ["products", "widget"]),
    ).resolves.toMatchObject({
      _id: "widget-es",
      locale: "es-us",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("slug in $slugs");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("site._ref == $siteId");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("locale == $locale");
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      siteId: "site-a",
      locale: "es-us",
      slugs: ["products", "widget"],
    });
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      pageId: "widget-es",
      siteId: "site-a",
      locale: "es-us",
    });
  });

  it("does not confuse duplicate slugs in different parent branches", async () => {
    fetchMock.mockResolvedValueOnce([
      { _id: "archive", slug: "archive" },
      { _id: "products", slug: "products" },
      { _id: "wrong-widget", slug: "widget", parent: { _ref: "archive" } },
      { _id: "right-widget", slug: "widget", parent: { _ref: "products" } },
    ]);

    await expect(
      resolvePageIdBySegments("site-a", "en-us", ["products", "widget"]),
    ).resolves.toBe("right-widget");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("supports deep hierarchies and repeated segment names in one request", async () => {
    fetchMock.mockResolvedValueOnce([
      { _id: "level-0", slug: "docs" },
      { _id: "level-1", slug: "docs", parent: { _ref: "level-0" } },
      { _id: "level-2", slug: "start", parent: { _ref: "level-1" } },
    ]);

    await expect(
      resolvePageIdBySegments("site-a", "en-us", ["docs", "docs", "start"]),
    ).resolves.toBe("level-2");

    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      siteId: "site-a",
      locale: "en-us",
      slugs: ["docs", "start"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed when any nested segment has an incorrect parent", async () => {
    fetchMock.mockResolvedValueOnce([
      { _id: "products", slug: "products" },
      { _id: "widget", slug: "widget", parent: { _ref: "other" } },
    ]);

    await expect(
      resolvePageBySegments("site-a", "en-us", ["products", "widget"]),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not treat an incomplete parent reference as a root Page", async () => {
    fetchMock.mockResolvedValueOnce([
      { _id: "broken", slug: "products", parent: {} },
    ]);

    await expect(
      resolvePageIdBySegments("site-a", "en-us", ["products"]),
    ).resolves.toBeNull();
  });

  it("does not fetch full Page content when the route does not exist", async () => {
    fetchMock.mockResolvedValueOnce([]);

    await expect(
      resolvePageBySegments("site-a", "en-us", ["missing"]),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
