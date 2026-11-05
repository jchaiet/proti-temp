import { describe, expect, it } from "vitest";

import { siteLocaleToHreflang } from "./hreflang";
import { siteLocaleToLanguageTag } from "./locale";

describe("SEO locale formatting", () => {
  it.each([
    ["en-us", "en-US"],
    ["es-us", "es-US"],
    ["fr-ca", "fr-CA"],
    ["fil-ph", "fil-PH"],
  ])(
    "maps Proti locale %s to application language tag %s",
    (locale, expected) => {
      expect(siteLocaleToLanguageTag(locale)).toBe(expected);
    },
  );

  it.each([
    ["en-us", "en-US"],
    ["es-us", "es-US"],
    ["fr-ca", "fr-CA"],
  ])("maps Google-supported locale %s to hreflang %s", (locale, expected) => {
    expect(siteLocaleToHreflang(locale)).toBe(expected);
  });

  it("does not reverse language and region", () => {
    expect(siteLocaleToLanguageTag("es-us")).not.toBe("us-ES");
    expect(siteLocaleToHreflang("es-us")).toBe("es-US");
  });

  it("omits 3-letter application language codes from Google hreflang", () => {
    expect(siteLocaleToLanguageTag("fil-ph")).toBe("fil-PH");
    expect(siteLocaleToHreflang("fil-ph")).toBeNull();
  });
});
