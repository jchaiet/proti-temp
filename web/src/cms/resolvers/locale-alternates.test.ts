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

import { buildAuthorLocaleLinks } from "./author";
import { resolveDocumentTranslations } from "./translation";

describe("locale alternate language tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds Author hreflang keys from language-region Proti locales", () => {
    const links = buildAuthorLocaleLinks({
      slug: "jane-smith",
      defaultLocale: "en-us",
      locales: [
        { code: "en-us" },
        { code: "es-us" },
        { code: "fr-ca" },
        { code: "fil-ph" },
      ],
      domains: ["example.com"],
    });

    expect(links.languageAlternates).toEqual({
      "en-US": "https://example.com/authors/jane-smith",
      "es-US": "https://example.com/es-us/authors/jane-smith",
      "fr-CA": "https://example.com/fr-ca/authors/jane-smith",
      "x-default": "https://example.com/authors/jane-smith",
    });

    expect(links.languageAlternates).not.toHaveProperty("us-ES");
    expect(links.languageAlternates).not.toHaveProperty("fil-PH");
  });

  it("builds Page hreflang only for published translations and adds x-default", async () => {
    mocks.fetch.mockImplementation(async (query: string) => {
      if (query.includes('_type == "site"')) {
        return {
          domains: ["example.com"],
          locales: [{ code: "en-us" }, { code: "es-us" }, { code: "fr-ca" }],
        };
      }

      throw new Error(`Unexpected query: ${query}`);
    });

    mocks.resolvePageSegmentsById.mockResolvedValue(["products", "widget"]);

    mocks.resolvePageIdBySegments.mockImplementation(
      async (_siteId: string, locale: string) =>
        locale === "fr-ca" ? null : `page-${locale}`,
    );

    const translations = await resolveDocumentTranslations({
      siteId: "site-acme",
      documentId: "page-en",
      documentType: "page",
      defaultLocale: "en-us",
      domains: ["example.com"],
    });

    expect(translations.localeHrefs).toEqual({
      "en-us": "/products/widget",
      "es-us": "/es-us/products/widget",
    });

    expect(translations.languageAlternates).toEqual({
      "en-US": "https://example.com/products/widget",
      "es-US": "https://example.com/es-us/products/widget",
      "x-default": "https://example.com/products/widget",
    });

    expect(translations.languageAlternates).not.toHaveProperty("fr-CA");
    expect(translations.languageAlternates).not.toHaveProperty("us-ES");
  });

  it("builds Blog hreflang keys and x-default from published translations", async () => {
    mocks.fetch.mockImplementation(
      async (query: string, params?: Record<string, unknown>) => {
        if (query.includes('_type == "site"')) {
          return {
            domains: ["example.com"],
            locales: [{ code: "en-us" }, { code: "es-us" }, { code: "fil-ph" }],
          };
        }

        if (query.includes("_id == $documentId")) {
          return {
            slug: "nutrition",
          };
        }

        if (query.includes("slug.current == $slug")) {
          expect(params?.locales).toEqual(["en-us", "es-us", "fil-ph"]);
          return [
            { locale: "en-us" },
            { locale: "es-us" },
            { locale: "fil-ph" },
          ];
        }

        throw new Error(`Unexpected query: ${query}`);
      },
    );

    const translations = await resolveDocumentTranslations({
      siteId: "site-acme",
      documentId: "blog-en",
      documentType: "blog",
      defaultLocale: "en-us",
      domains: ["example.com"],
    });

    expect(translations.localeHrefs).toEqual({
      "en-us": "/blog/nutrition",
      "es-us": "/es-us/blog/nutrition",
      "fil-ph": "/fil-ph/blog/nutrition",
    });

    expect(translations.languageAlternates).toEqual({
      "en-US": "https://example.com/blog/nutrition",
      "es-US": "https://example.com/es-us/blog/nutrition",
      "x-default": "https://example.com/blog/nutrition",
    });

    expect(translations.languageAlternates).not.toHaveProperty("us-ES");
    expect(translations.languageAlternates).not.toHaveProperty("fil-PH");
  });
});
