import { describe, expect, it } from "vitest";

import type { Site } from "@/sanity/types";

import {
  resolveLocale,
  resolveLocaleCodeFromPathname,
  segmentsToPath,
  siteLocaleToLanguageTag,
} from "./locale";

const site: Site = {
  _id: "site-proti",
  name: "Proti",
  key: "proti",
  domains: ["example.com"],
  defaultLocale: "en-us",
  locales: [
    {
      code: "en-us",
      label: "English",
    },
    {
      code: "es-us",
      label: "Spanish",
    },
    {
      code: "fr-ca",
      label: "French",
    },
  ],
};

describe("resolveLocale", () => {
  it("uses the default locale when the path has no locale prefix", () => {
    expect(resolveLocale(site, ["products", "widget"])).toEqual({
      locale: "en-us",
      pageSegments: ["products", "widget"],
      localeWasExplicit: false,
      explicitDefaultLocale: false,
    });
  });

  it("removes a supported non-default locale prefix", () => {
    expect(resolveLocale(site, ["es-us", "products", "widget"])).toEqual({
      locale: "es-us",
      pageSegments: ["products", "widget"],
      localeWasExplicit: true,
      explicitDefaultLocale: false,
    });
  });

  it("detects an explicitly-prefixed default locale", () => {
    expect(resolveLocale(site, ["en-us", "products", "widget"])).toEqual({
      locale: "en-us",
      pageSegments: ["products", "widget"],
      localeWasExplicit: true,
      explicitDefaultLocale: true,
    });
  });

  it("does not mistake an unsupported first segment for a locale", () => {
    expect(resolveLocale(site, ["en-gb", "products"])).toEqual({
      locale: "en-us",
      pageSegments: ["en-gb", "products"],
      localeWasExplicit: false,
      explicitDefaultLocale: false,
    });
  });
});

describe("segmentsToPath", () => {
  it("returns / for the homepage", () => {
    expect(segmentsToPath([])).toBe("/");
  });

  it("joins page hierarchy segments", () => {
    expect(segmentsToPath(["products", "widget"])).toBe("/products/widget");
  });
});

describe("siteLocaleToLanguageTag", () => {
  it.each([
    ["en-us", "en-US"],
    ["es-us", "es-US"],
    ["fr-ca", "fr-CA"],
    ["en", "en"],
    ["", "en"],
  ])("converts standard locale %s to %s", (locale, expected) => {
    expect(siteLocaleToLanguageTag(locale)).toBe(expected);
  });

  it.each([
    ["us-en", "en-US"],
    ["us-es", "es-US"],
    ["ca-fr", "fr-CA"],
  ])("temporarily accepts legacy locale %s as %s", (locale, expected) => {
    expect(siteLocaleToLanguageTag(locale)).toBe(expected);
  });
});

describe("resolveLocaleCodeFromPathname", () => {
  const locales = ["en-us", "es-us", "fr-ca"];

  it("uses the Site default locale for an unprefixed route", () => {
    expect(
      resolveLocaleCodeFromPathname({
        pathname: "/products/widget",
        defaultLocale: "en-us",
        locales,
      }),
    ).toBe("en-us");
  });

  it("uses a supported locale prefix", () => {
    expect(
      resolveLocaleCodeFromPathname({
        pathname: "/es-us/products/widget",
        defaultLocale: "en-us",
        locales,
      }),
    ).toBe("es-us");
  });

  it("uses the default locale for /", () => {
    expect(
      resolveLocaleCodeFromPathname({
        pathname: "/",
        defaultLocale: "en-us",
        locales,
      }),
    ).toBe("en-us");
  });

  it("does not accept an unsupported locale prefix", () => {
    expect(
      resolveLocaleCodeFromPathname({
        pathname: "/en-gb/products/widget",
        defaultLocale: "en-us",
        locales,
      }),
    ).toBe("en-us");
  });
});
