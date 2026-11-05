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

import { getPageUrl } from "./page-url";

beforeEach(() => {
  fetchMock.mockReset();
});

describe("getPageUrl", () => {
  it("builds a nested default-locale Page URL", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "en-us",
        parent: { _ref: "page-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "en-us",
        },
      })
      .mockResolvedValueOnce({
        _id: "page-parent",
        slug: "products",
        locale: "en-us",
        site: { _ref: "site-a" },
      });

    await expect(
      getPageUrl("drafts.page-child", {
        expectedSiteId: "drafts.site-a",
        expectedLocale: "en-us",
      }),
    ).resolves.toBe("/products/widget");
  });

  it("prefixes a non-default locale", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "page-1",
      slug: "producto",
      locale: "es-us",
      site: {
        _id: "site-a",
        defaultLocale: "en-us",
      },
    });

    await expect(
      getPageUrl("page-1", {
        expectedSiteId: "site-a",
        expectedLocale: "es-us",
      }),
    ).resolves.toBe("/es-us/producto");
  });

  it("returns the correct homepage URL", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "home-en",
      locale: "en-us",
      isHomepage: true,
      site: {
        _id: "site-a",
        defaultLocale: "en-us",
      },
    });

    await expect(getPageUrl("home-en")).resolves.toBe("/");

    fetchMock.mockResolvedValueOnce({
      _id: "home-es",
      locale: "es-us",
      isHomepage: true,
      site: {
        _id: "site-a",
        defaultLocale: "en-us",
      },
    });

    await expect(getPageUrl("home-es")).resolves.toBe("/es-us");
  });

  it("rejects a Page from another Site", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "page-1",
      slug: "widget",
      locale: "en-us",
      site: {
        _id: "site-b",
        defaultLocale: "en-us",
      },
    });

    await expect(
      getPageUrl("page-1", {
        expectedSiteId: "site-a",
        expectedLocale: "en-us",
      }),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a Page from another Locale", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "page-1",
      slug: "widget",
      locale: "es-us",
      site: {
        _id: "site-a",
        defaultLocale: "en-us",
      },
    });

    await expect(
      getPageUrl("page-1", {
        expectedSiteId: "site-a",
        expectedLocale: "en-us",
      }),
    ).resolves.toBeNull();
  });

  it("rejects a parent from another Site", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "en-us",
        parent: { _ref: "page-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "en-us",
        },
      })
      .mockResolvedValueOnce({
        _id: "page-parent",
        slug: "products",
        locale: "en-us",
        site: { _ref: "site-b" },
      });

    await expect(
      getPageUrl("page-child", {
        expectedSiteId: "site-a",
        expectedLocale: "en-us",
      }),
    ).resolves.toBeNull();
  });

  it("rejects a parent from another Locale", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "en-us",
        parent: { _ref: "page-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "en-us",
        },
      })
      .mockResolvedValueOnce({
        _id: "page-parent",
        slug: "products",
        locale: "es-us",
        site: { _ref: "site-a" },
      });

    await expect(
      getPageUrl("page-child", {
        expectedSiteId: "site-a",
        expectedLocale: "en-us",
      }),
    ).resolves.toBeNull();
  });

  it("fails safely when a referenced parent is missing", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "en-us",
        parent: { _ref: "missing-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "en-us",
        },
      })
      .mockResolvedValueOnce(null);

    await expect(getPageUrl("page-child")).resolves.toBeNull();
  });

  it("fails safely on a circular Page hierarchy", async () => {
    fetchMock
      .mockResolvedValueOnce({
        _id: "page-child",
        slug: "widget",
        locale: "en-us",
        parent: { _ref: "page-parent" },
        site: {
          _id: "site-a",
          defaultLocale: "en-us",
        },
      })
      .mockResolvedValueOnce({
        _id: "page-parent",
        slug: "products",
        locale: "en-us",
        site: { _ref: "site-a" },
        parent: { _ref: "page-child" },
      });

    await expect(getPageUrl("page-child")).resolves.toBeNull();
  });
});
