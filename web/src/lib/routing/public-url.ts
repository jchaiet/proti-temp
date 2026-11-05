import { siteLocaleToHreflang } from "@/lib/routing/hreflang";

export interface BuildLocaleLinksOptions {
  routePath: string;
  defaultLocale: string;
  locales?: Array<{
    code?: string;
  }>;
  domains?: string[];
  canonicalDomain?: string;
  availableLocales?: string[];
}

export interface LocaleLinks {
  localeHrefs: Record<string, string>;
  languageAlternates: Record<string, string>;
}

export function normalizePublicPath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return path.replace(/\/+$/, "");
}

export function getLocalePrefix(locale: string, defaultLocale: string): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}

export function buildLocalePublicPath({
  locale,
  defaultLocale,
  path,
}: {
  locale: string;
  defaultLocale: string;
  path: string;
}): string {
  const routePath = normalizePublicPath(path);
  const localePrefix = getLocalePrefix(locale, defaultLocale);

  if (!localePrefix) {
    return routePath;
  }

  if (routePath === "/") {
    return localePrefix;
  }

  return `${localePrefix}${routePath}`;
}

function normalizeDomain(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  return cleaned || undefined;
}

/**
 * Resolve the single public origin used for canonical URLs, hreflang,
 * structured data, sitemap URLs, and robots.txt.
 *
 * `canonicalDomain` is authoritative when configured. Falling back to the
 * first Site domain keeps existing Sites working while they are migrated.
 */
export function getSiteOrigin(
  domains?: string[],
  canonicalDomain?: string,
): string | null {
  const domain =
    normalizeDomain(canonicalDomain) ??
    (domains ?? []).map(normalizeDomain).find(Boolean);

  if (!domain) {
    return null;
  }

  const hostname = domain
    .replace(/^\[([^\]]+)\](?::\d+)?$/, "$1")
    .replace(/:\d+$/, "")
    .toLowerCase();

  const isLocal =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  return `${isLocal ? "http" : "https"}://${domain}`;
}

export function toAbsolutePublicUrl(
  value: string | undefined,
  origin: string | null | undefined,
): string | undefined {
  const url = value?.trim();

  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      return new URL(url).toString();
    } catch {
      return undefined;
    }
  }

  if (!origin) {
    return undefined;
  }

  try {
    return new URL(url, `${origin}/`).toString();
  } catch {
    return undefined;
  }
}

export function toAbsoluteOrRelativeHref(
  href: string,
  origin: string | null | undefined,
): string {
  return toAbsolutePublicUrl(href, origin) ?? href;
}

function normalizeComparableUrl(value: string): string | undefined {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return undefined;
  }

  parsed.hash = "";

  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  return parsed.toString();
}

export function publicUrlsMatch(a: string, b: string): boolean {
  const left = normalizeComparableUrl(a);
  const right = normalizeComparableUrl(b);

  return Boolean(left && right && left === right);
}

export function resolveCanonicalPublicUrl({
  origin,
  publicPath,
  canonicalUrl,
}: {
  origin: string | null | undefined;
  publicPath: string;
  canonicalUrl?: string;
}): {
  publicUrl?: string;
  canonical?: string;
  isSelfCanonical: boolean;
} {
  const publicUrl = toAbsolutePublicUrl(
    normalizePublicPath(publicPath),
    origin,
  );

  const explicitCanonical = canonicalUrl?.trim()
    ? toAbsolutePublicUrl(canonicalUrl, origin)
    : undefined;

  const canonical = explicitCanonical ?? publicUrl;

  return {
    publicUrl,
    canonical,
    isSelfCanonical:
      !canonicalUrl?.trim() ||
      Boolean(canonical && publicUrl && publicUrlsMatch(canonical, publicUrl)),
  };
}

export function buildLocaleLinks({
  routePath,
  defaultLocale,
  locales = [],
  domains = [],
  canonicalDomain,
  availableLocales,
}: BuildLocaleLinksOptions): LocaleLinks {
  const configuredLocales = Array.from(
    new Set(
      locales
        .map((locale) => locale.code)
        .filter((code): code is string => Boolean(code)),
    ),
  );

  const allowedLocales = availableLocales
    ? new Set(availableLocales)
    : undefined;

  const origin = getSiteOrigin(domains, canonicalDomain);
  const localeHrefs: Record<string, string> = {};
  const languageAlternates: Record<string, string> = {};

  for (const locale of configuredLocales) {
    if (allowedLocales && !allowedLocales.has(locale)) {
      continue;
    }

    const href = buildLocalePublicPath({
      locale,
      defaultLocale,
      path: routePath,
    });

    localeHrefs[locale] = href;

    const hreflang = siteLocaleToHreflang(locale);

    if (!hreflang) {
      continue;
    }

    languageAlternates[hreflang] = toAbsoluteOrRelativeHref(href, origin);
  }

  const defaultHref = localeHrefs[defaultLocale];

  if (defaultHref) {
    languageAlternates["x-default"] = toAbsoluteOrRelativeHref(
      defaultHref,
      origin,
    );
  }

  return {
    localeHrefs,
    languageAlternates,
  };
}
