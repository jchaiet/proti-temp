import { describe, expect, it } from "vitest";

import {
  buildLocaleLinks,
  buildLocalePublicPath,
  getSiteOrigin,
  publicUrlsMatch,
  resolveCanonicalPublicUrl,
} from "./public-url";

describe("public URL helpers", () => {
  it("omits the default locale and prefixes non-default locales", () => {
    expect(
      buildLocalePublicPath({
        locale: "en-us",
        defaultLocale: "en-us",
        path: "/products/widget/",
      }),
    ).toBe("/products/widget");

    expect(
      buildLocalePublicPath({
        locale: "es-us",
        defaultLocale: "en-us",
        path: "/products/widget/",
      }),
    ).toBe("/es-us/products/widget");

    expect(
      buildLocalePublicPath({
        locale: "es-us",
        defaultLocale: "en-us",
        path: "/",
      }),
    ).toBe("/es-us");
  });

  it("uses the explicit canonical domain instead of domains array order", () => {
    expect(
      getSiteOrigin(["www.example.com", "example.com"], "example.com"),
    ).toBe("https://example.com");
  });

  it("falls back to the first Site domain during migration", () => {
    expect(getSiteOrigin(["example.com"])).toBe("https://example.com");
    expect(getSiteOrigin(["localhost"])).toBe("http://localhost");
  });

  it("builds locale hrefs and hreflang values from one route contract", () => {
    expect(
      buildLocaleLinks({
        routePath: "/products/widget",
        defaultLocale: "en-us",
        locales: [{ code: "en-us" }, { code: "es-us" }],
        domains: ["www.example.com", "example.com"],
        canonicalDomain: "example.com",
      }),
    ).toEqual({
      localeHrefs: {
        "en-us": "/products/widget",
        "es-us": "/es-us/products/widget",
      },
      languageAlternates: {
        "en-US": "https://example.com/products/widget",
        "es-US": "https://example.com/es-us/products/widget",
        "x-default": "https://example.com/products/widget",
      },
    });
  });

  it("can limit alternate links to locales with a real equivalent", () => {
    expect(
      buildLocaleLinks({
        routePath: "/products/widget",
        defaultLocale: "en-us",
        locales: [{ code: "en-us" }, { code: "es-us" }],
        availableLocales: ["en-us"],
        domains: ["example.com"],
      }).languageAlternates,
    ).toEqual({
      "en-US": "https://example.com/products/widget",
      "x-default": "https://example.com/products/widget",
    });
  });

  it("keeps three-letter application locales routable but omits unsupported hreflang", () => {
    expect(
      buildLocaleLinks({
        routePath: "/about",
        defaultLocale: "en-us",
        locales: [{ code: "en-us" }, { code: "fil-ph" }],
        domains: ["example.com"],
      }),
    ).toEqual({
      localeHrefs: {
        "en-us": "/about",
        "fil-ph": "/fil-ph/about",
      },
      languageAlternates: {
        "en-US": "https://example.com/about",
        "x-default": "https://example.com/about",
      },
    });
  });

  it("treats trailing slash variants as the same canonical URL", () => {
    expect(
      publicUrlsMatch(
        "https://example.com/products/widget",
        "https://example.com/products/widget/",
      ),
    ).toBe(true);
  });

  it("identifies an off-route canonical override", () => {
    expect(
      resolveCanonicalPublicUrl({
        origin: "https://example.com",
        publicPath: "/products/widget",
        canonicalUrl: "https://canonical.example.com/widget",
      }),
    ).toEqual({
      publicUrl: "https://example.com/products/widget",
      canonical: "https://canonical.example.com/widget",
      isSelfCanonical: false,
    });
  });
});
