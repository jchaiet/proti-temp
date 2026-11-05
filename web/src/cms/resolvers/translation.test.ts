import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  resolvePageIdBySegments: vi.fn(),
  resolvePageSegmentsById: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.fetch,
  },
}));

vi.mock("@/sanity/queries/page", () => ({
  resolvePageIdBySegments: mocks.resolvePageIdBySegments,
  resolvePageSegmentsById: mocks.resolvePageSegmentsById,
}));

import { resolveDocumentTranslations } from "./translation";

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.resolvePageIdBySegments.mockReset();
  mocks.resolvePageSegmentsById.mockReset();
});

describe("resolveDocumentTranslations - Page", () => {
  it("returns exact locale equivalents and x-default when translations exist", async () => {
    mocks.fetch.mockResolvedValueOnce({
      domains: ["www.example.com", "example.com"],
      canonicalDomain: "example.com",
      locales: [
        {
          code: "en-us",
        },
        {
          code: "es-us",
        },
      ],
    });

    mocks.resolvePageSegmentsById.mockResolvedValue(["products", "widget"]);

    mocks.resolvePageIdBySegments.mockImplementation(
      async (_siteId: string, locale: string) =>
        locale === "en-us" ? "page-en" : "page-es",
    );

    const result = await resolveDocumentTranslations({
      siteId: "site-proti",
      documentId: "page-en",
      documentType: "page",
      defaultLocale: "en-us",
      domains: ["www.example.com", "example.com"],
      canonicalDomain: "example.com",
    });

    expect(result.localeHrefs).toEqual({
      "en-us": "/products/widget",
      "es-us": "/es-us/products/widget",
    });

    expect(result.languageAlternates).toEqual({
      "en-US": "https://example.com/products/widget",
      "es-US": "https://example.com/es-us/products/widget",
      "x-default": "https://example.com/products/widget",
    });
  });

  it("does not advertise a locale whose exact Page equivalent is missing", async () => {
    mocks.fetch.mockResolvedValueOnce({
      domains: ["www.example.com", "example.com"],
      canonicalDomain: "example.com",
      locales: [
        {
          code: "en-us",
        },
        {
          code: "es-us",
        },
      ],
    });

    mocks.resolvePageSegmentsById.mockResolvedValue(["products", "widget"]);

    mocks.resolvePageIdBySegments.mockImplementation(
      async (_siteId: string, locale: string) =>
        locale === "en-us" ? "page-en" : null,
    );

    const result = await resolveDocumentTranslations({
      siteId: "site-proti",
      documentId: "page-en",
      documentType: "page",
      defaultLocale: "en-us",
      domains: ["www.example.com", "example.com"],
      canonicalDomain: "example.com",
    });

    expect(result.localeHrefs).toEqual({
      "en-us": "/products/widget",
    });

    expect(result.languageAlternates).toEqual({
      "en-US": "https://example.com/products/widget",
      "x-default": "https://example.com/products/widget",
    });

    expect(result.localeHrefs["es-us"]).toBeUndefined();
    expect(result.languageAlternates["es-US"]).toBeUndefined();
  });
});

describe("resolveDocumentTranslations - Blog", () => {
  it("uses the same Blog slug across locale-prefixed routes", async () => {
    mocks.fetch
      .mockResolvedValueOnce({
        domains: ["example.com"],
        locales: [
          {
            code: "en-us",
          },
          {
            code: "es-us",
          },
        ],
      })
      .mockResolvedValueOnce({
        slug: "nutrition-basics",
      })
      .mockResolvedValueOnce([{ locale: "en-us" }, { locale: "es-us" }]);

    const result = await resolveDocumentTranslations({
      siteId: "site-proti",
      documentId: "blog-en",
      documentType: "blog",
      defaultLocale: "en-us",
      domains: ["www.example.com", "example.com"],
      canonicalDomain: "example.com",
    });

    expect(mocks.fetch).toHaveBeenCalledTimes(3);
    expect(mocks.fetch.mock.calls[2]?.[0]).toContain("locale in $locales");
    expect(mocks.fetch.mock.calls[2]?.[1]).toEqual({
      siteId: "site-proti",
      locales: ["en-us", "es-us"],
      slug: "nutrition-basics",
    });

    expect(result.localeHrefs).toEqual({
      "en-us": "/blog/nutrition-basics",
      "es-us": "/es-us/blog/nutrition-basics",
    });

    expect(result.languageAlternates).toEqual({
      "en-US": "https://example.com/blog/nutrition-basics",
      "es-US": "https://example.com/es-us/blog/nutrition-basics",
      "x-default": "https://example.com/blog/nutrition-basics",
    });
  });

  it("omits a missing Blog translation", async () => {
    mocks.fetch
      .mockResolvedValueOnce({
        domains: ["example.com"],
        locales: [
          {
            code: "en-us",
          },
          {
            code: "es-us",
          },
        ],
      })
      .mockResolvedValueOnce({
        slug: "nutrition-basics",
      })
      .mockResolvedValueOnce([{ locale: "en-us" }]);

    const result = await resolveDocumentTranslations({
      siteId: "site-proti",
      documentId: "blog-en",
      documentType: "blog",
      defaultLocale: "en-us",
      domains: ["www.example.com", "example.com"],
      canonicalDomain: "example.com",
    });

    expect(result.localeHrefs).toEqual({
      "en-us": "/blog/nutrition-basics",
    });

    expect(result.languageAlternates["es-US"]).toBeUndefined();
  });
});
