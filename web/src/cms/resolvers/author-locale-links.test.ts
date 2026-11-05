import { describe, expect, it, vi } from "vitest";

/*
 * buildAuthorLocaleLinks() is a pure helper, but it lives in the Author
 * resolver module, which also imports the Sanity client for data-fetching
 * functions.
 *
 * Mock the client before importing the resolver so this unit test does not
 * initialize next-sanity / @sanity/client. That keeps the test focused on
 * locale-link generation and avoids package-runtime coupling that is
 * irrelevant to these assertions.
 */
vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: vi.fn(),
  },
}));

import { buildAuthorLocaleLinks } from "./author";

describe("buildAuthorLocaleLinks", () => {
  it("uses the canonical domain and only emits real Author locales", () => {
    const links = buildAuthorLocaleLinks({
      slug: "jane-smith",
      defaultLocale: "en-us",
      locales: [
        {
          code: "en-us",
        },
        {
          code: "es-us",
        },
        {
          code: "fr-ca",
        },
        {
          code: "fil-ph",
        },
      ],
      domains: ["www.example.com", "example.com"],
      canonicalDomain: "example.com",
      availableLocales: ["en-us", "es-us", "fil-ph"],
    });

    expect(links.localeHrefs).toEqual({
      "en-us": "/authors/jane-smith",
      "es-us": "/es-us/authors/jane-smith",
      "fil-ph": "/fil-ph/authors/jane-smith",
    });

    expect(links.languageAlternates).toEqual({
      "en-US": "https://example.com/authors/jane-smith",
      "es-US": "https://example.com/es-us/authors/jane-smith",
      "x-default": "https://example.com/authors/jane-smith",
    });
  });

  it("does not invent a non-default Author locale when no translation exists", () => {
    const links = buildAuthorLocaleLinks({
      slug: "jane-smith",
      defaultLocale: "en-us",
      locales: [
        {
          code: "en-us",
        },
        {
          code: "es-us",
        },
      ],
      domains: ["example.com"],
      canonicalDomain: "example.com",
      availableLocales: ["en-us"],
    });

    expect(links.localeHrefs).toEqual({
      "en-us": "/authors/jane-smith",
    });

    expect(links.languageAlternates).toEqual({
      "en-US": "https://example.com/authors/jane-smith",
      "x-default": "https://example.com/authors/jane-smith",
    });
  });
});
