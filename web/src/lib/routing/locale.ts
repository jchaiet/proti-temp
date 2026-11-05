import type { Site } from "@/sanity/types";

export type ResolvedLocale = {
  locale: string;
  pageSegments: string[];
  localeWasExplicit: boolean;
  explicitDefaultLocale: boolean;
};

export function resolveLocale(site: Site, segments: string[]): ResolvedLocale {
  const firstSegment = segments[0];

  const supportedLocales = new Set(site.locales.map((locale) => locale.code));

  if (firstSegment && supportedLocales.has(firstSegment)) {
    return {
      locale: firstSegment,

      pageSegments: segments.slice(1),

      localeWasExplicit: true,

      explicitDefaultLocale: firstSegment === site.defaultLocale,
    };
  }

  return {
    locale: site.defaultLocale,
    pageSegments: segments,
    localeWasExplicit: false,
    explicitDefaultLocale: false,
  };
}

export function segmentsToPath(segments: string[]): string {
  if (segments.length === 0) {
    return "/";
  }

  return `/${segments.join("/")}`;
}

export function siteLocaleToLanguageTag(locale: string): string {
  const normalized = locale.trim().toLowerCase();

  /*
   * Proti Site locale codes use standard BCP 47 language-region ordering:
   *
   * en-us -> en-US
   * es-us -> es-US
   * fr-ca -> fr-CA
   *
   * Keep these legacy aliases temporarily while older fixtures/content are
   * being migrated.
   */
  const legacyLocaleMap: Record<string, string> = {
    "us-en": "en-US",
    "us-es": "es-US",
    "ca-fr": "fr-CA",
  };

  const legacyTag = legacyLocaleMap[normalized];

  if (legacyTag) {
    return legacyTag;
  }

  const parts = normalized.split("-").filter(Boolean);

  if (parts.length === 2) {
    const [language, region] = parts;

    if (language && region) {
      return `${language.toLowerCase()}-${region.toUpperCase()}`;
    }
  }

  return normalized || "en";
}

export function resolveLocaleCodeFromPathname({
  pathname,
  defaultLocale,
  locales,
}: {
  pathname: string;
  defaultLocale: string;
  locales: string[];
}): string {
  const firstSegment = pathname.split("/").filter(Boolean)[0];

  if (firstSegment && locales.includes(firstSegment)) {
    return firstSegment;
  }

  return defaultLocale;
}
