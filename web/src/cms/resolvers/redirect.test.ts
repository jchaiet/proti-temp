import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CmsRedirect } from "@/cms/types";
import { REDIRECT_BY_SOURCE_QUERY } from "@/sanity/queries/redirect";

const mocks = vi.hoisted(() => ({
  fetch:
    vi.fn<
      (query: string, params?: Record<string, unknown>) => Promise<unknown>
    >(),
  getPageUrl: vi.fn<
    (
      pageReference: string,
      options?: {
        expectedSiteId?: string;
        expectedLocale?: string;
      },
    ) => Promise<string | null>
  >(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.fetch,
  },
}));

vi.mock("@/sanity/queries/page-url", () => ({
  getPageUrl: mocks.getPageUrl,
}));

import { appendRedirectSearchParams, resolveRedirect } from "./redirect";

function redirectDocument(overrides: Partial<CmsRedirect> = {}): CmsRedirect {
  return {
    _id: "redirect-1",
    sourcePath: "/old",
    redirectType: "permanent",
    preserveQuery: true,
    enabled: true,
    destination: {
      type: "path",
      path: "/new",
    },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.getPageUrl.mockReset();
});

describe("resolveRedirect", () => {
  it("refuses unsafe path and external redirect destinations from stale CMS data", async () => {
    for (const destination of [
      { type: "path" as const, path: "//attacker.test" },
      { type: "path" as const, path: "/\\attacker.test" },
      { type: "external" as const, externalUrl: "javascript:alert(1)" },
      {
        type: "external" as const,
        externalUrl: "https://user:pass@example.com",
      },
    ]) {
      mocks.fetch.mockResolvedValueOnce([redirectDocument({ destination })]);
      await expect(
        resolveRedirect({
          siteId: "site-a",
          locale: "en-us",
          sourcePath: "/old",
        }),
      ).resolves.toBeNull();
    }
  });

  it("does not query without Site and Locale identity", async () => {
    await expect(
      resolveRedirect({
        siteId: "",
        locale: "en-us",
        sourcePath: "/old",
      }),
    ).resolves.toBeNull();

    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("looks up both trailing-slash variants within Site and Locale", async () => {
    mocks.fetch.mockResolvedValueOnce([redirectDocument()]);

    await resolveRedirect({
      siteId: "site-a",
      locale: "en-us",
      sourcePath: " /old/ ",
    });

    expect(mocks.fetch).toHaveBeenCalledWith(
      REDIRECT_BY_SOURCE_QUERY,
      {
        siteId: "site-a",
        locale: "en-us",
        sourcePaths: ["/old", "/old/"],
      },
      {
        next: {
          revalidate: false,
        },
      },
    );
  });

  it("fails closed when both trailing-slash variants exist", async () => {
    mocks.fetch.mockResolvedValueOnce([
      redirectDocument({ _id: "redirect-a", sourcePath: "/old" }),
      redirectDocument({ _id: "redirect-b", sourcePath: "/old/" }),
    ]);

    await expect(
      resolveRedirect({
        siteId: "site-a",
        locale: "en-us",
        sourcePath: "/old",
      }),
    ).resolves.toBeNull();
  });

  it("maps permanent and temporary Redirect types", async () => {
    mocks.fetch.mockResolvedValueOnce([redirectDocument()]);

    await expect(
      resolveRedirect({
        siteId: "site-a",
        locale: "en-us",
        sourcePath: "/old",
      }),
    ).resolves.toEqual({
      destination: "/new",
      permanent: true,
      preserveQuery: true,
    });

    mocks.fetch.mockResolvedValueOnce([
      redirectDocument({
        redirectType: "temporary",
        preserveQuery: false,
      }),
    ]);

    await expect(
      resolveRedirect({
        siteId: "site-a",
        locale: "en-us",
        sourcePath: "/old",
      }),
    ).resolves.toEqual({
      destination: "/new",
      permanent: false,
      preserveQuery: false,
    });
  });

  it("prefixes a locale-relative path destination", async () => {
    mocks.fetch.mockResolvedValueOnce([redirectDocument()]);

    await expect(
      resolveRedirect({
        siteId: "site-a",
        locale: "es-us",
        sourcePath: "/old",
        localePrefix: "/es-us",
      }),
    ).resolves.toMatchObject({
      destination: "/es-us/new",
    });
  });

  it("keeps default-locale path destinations unprefixed", async () => {
    mocks.fetch.mockResolvedValueOnce([redirectDocument()]);

    await expect(
      resolveRedirect({
        siteId: "site-a",
        locale: "en-us",
        sourcePath: "/old",
        localePrefix: "",
      }),
    ).resolves.toMatchObject({
      destination: "/new",
    });
  });

  it("validates Internal Page destinations against Site and Locale", async () => {
    mocks.fetch.mockResolvedValueOnce([
      redirectDocument({
        destination: {
          type: "internal",
          internalPageId: "drafts.page-1",
        },
      }),
    ]);
    mocks.getPageUrl.mockResolvedValueOnce("/products/widget");

    await expect(
      resolveRedirect({
        siteId: "site-a",
        locale: "en-us",
        sourcePath: "/old",
      }),
    ).resolves.toMatchObject({
      destination: "/products/widget",
    });

    expect(mocks.getPageUrl).toHaveBeenCalledWith("drafts.page-1", {
      expectedSiteId: "site-a",
      expectedLocale: "en-us",
    });
  });

  it("fails safely when an Internal Page destination is stale or invalid", async () => {
    mocks.fetch.mockResolvedValueOnce([
      redirectDocument({
        destination: {
          type: "internal",
          internalPageId: "page-1",
        },
      }),
    ]);
    mocks.getPageUrl.mockResolvedValueOnce(null);

    await expect(
      resolveRedirect({
        siteId: "site-a",
        locale: "en-us",
        sourcePath: "/old",
      }),
    ).resolves.toBeNull();
  });

  it("leaves an external destination unchanged", async () => {
    mocks.fetch.mockResolvedValueOnce([
      redirectDocument({
        destination: {
          type: "external",
          externalUrl: "https://example.org/new",
        },
      }),
    ]);

    await expect(
      resolveRedirect({
        siteId: "site-a",
        locale: "en-us",
        sourcePath: "/old",
      }),
    ).resolves.toMatchObject({
      destination: "https://example.org/new",
    });
  });

  it("rejects a Redirect that resolves back to its own public path", async () => {
    mocks.fetch.mockResolvedValueOnce([
      redirectDocument({
        destination: {
          type: "path",
          path: "/old",
        },
      }),
    ]);

    await expect(
      resolveRedirect({
        siteId: "site-a",
        locale: "es-us",
        sourcePath: "/old",
        localePrefix: "/es-us",
      }),
    ).resolves.toBeNull();
  });
});

describe("appendRedirectSearchParams", () => {
  it("appends incoming query values to a relative destination", () => {
    expect(
      appendRedirectSearchParams("/new?existing=1#details", {
        q: "search",
        tag: ["one", "two"],
        ignored: undefined,
      }),
    ).toBe("/new?existing=1&q=search&tag=one&tag=two#details");
  });

  it("appends incoming query values to an external destination", () => {
    expect(
      appendRedirectSearchParams("https://example.org/new?existing=1", {
        q: "search",
      }),
    ).toBe("https://example.org/new?existing=1&q=search");
  });

  it("returns the original destination when no query values exist", () => {
    expect(
      appendRedirectSearchParams("/new", {
        q: undefined,
        tag: [],
      }),
    ).toBe("/new");
  });
});
