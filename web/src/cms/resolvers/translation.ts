import { buildLocaleLinks } from "@/lib/routing/public-url";

import { sanityFetch } from "@/sanity/fetch";

import {
  resolvePageIdBySegments,
  resolvePageSegmentsById,
} from "@/sanity/queries/page";

export type TranslationDocumentType = "page" | "blog";

type SiteLocale = {
  code?: string;
};

type SiteTranslationConfig = {
  domains?: string[];
  canonicalDomain?: string;
  locales?: SiteLocale[];
};

export interface ResolveDocumentTranslationsOptions {
  siteId: string;

  documentId: string;
  documentType: TranslationDocumentType;

  defaultLocale: string;

  /**
   * Domains are already available from resolveSiteByHost(), so callers can
   * pass them and avoid relying on another Site query for the SEO origin.
   *
   * The resolver still queries the Site for Supported Locales because
   * translation availability is determined per configured locale.
   */
  domains?: string[];
  canonicalDomain?: string;
}

export type DocumentTranslations = {
  /**
   * Public application URLs keyed by the CMS locale code.
   *
   * Example:
   * {
   *   "en-us": "/products/widget",
   *   "es-us": "/es-us/products/widget"
   * }
   */
  localeHrefs: Record<string, string>;

  /**
   * SEO alternate URLs keyed by hreflang value.
   *
   * The CMS uses region-language codes such as `es-us`, while hreflang
   * expects language-region ordering such as `es-US`.
   */
  languageAlternates: Record<string, string>;
};

const SITE_TRANSLATION_CONFIG_QUERY = `
  *[
    _type == "site" &&
    _id == $siteId
  ][0]{
    domains,
    canonicalDomain,

    locales[]{
      code
    }
  }
`;

const BLOG_SLUG_BY_ID_QUERY = `
  *[
    _type == "blog" &&
    _id == $documentId &&
    site._ref == $siteId
  ][0]{
    "slug": slug.current
  }
`;

/** Fetch available locales with one GROQ request, regardless of locale count. */
const BLOG_LOCALES_BY_SLUG_QUERY = `
  *[
    _type == "blog" &&
    site._ref == $siteId &&
    locale in $locales &&
    slug.current == $slug
  ]{
    locale
  }
`;

async function getBlogSlugById(
  siteId: string,
  documentId: string,
): Promise<string | null> {
  const blog = await sanityFetch<{ slug?: string } | null>(
    BLOG_SLUG_BY_ID_QUERY,
    {
      siteId,
      documentId,
    },
  );

  return blog?.slug ?? null;
}

async function getBlogAvailableLocales(
  siteId: string,
  locales: string[],
  slug: string,
): Promise<string[]> {
  const matches = await sanityFetch<Array<{ locale?: string }> | null>(
    BLOG_LOCALES_BY_SLUG_QUERY,
    {
      siteId,
      locales,
      slug,
    },
  );

  const configuredLocales = new Set(locales);

  return Array.from(
    new Set(
      (matches ?? [])
        .map((match) => match.locale)
        .filter(
          (locale): locale is string =>
            typeof locale === "string" && configuredLocales.has(locale),
        ),
    ),
  );
}

/**
 * Resolve same-path translations.
 *
 * Translation Groups are intentionally not used.
 *
 * Pages are equivalent when they have:
 *   same Site
 *   + same relative Page hierarchy / path
 *   + different Locale
 *
 * Blogs are equivalent when they have:
 *   same Site
 *   + same slug
 *   + different Locale
 *
 * Production requests consider published documents only; Draft Mode considers
 * the draft overlay as well. Missing translations are omitted so HeaderUtilities
 * can fall back to the
 * target Locale homepage and SEO does not emit an incorrect hreflang.
 */
export async function resolveDocumentTranslations({
  siteId,
  documentId,
  documentType,
  defaultLocale,
  domains = [],
  canonicalDomain,
}: ResolveDocumentTranslationsOptions): Promise<DocumentTranslations> {
  const site = await sanityFetch<SiteTranslationConfig | null>(
    SITE_TRANSLATION_CONFIG_QUERY,
    {
      siteId,
    },
  );

  const localeCodes = Array.from(
    new Set(
      (site?.locales ?? [])
        .map((locale) => locale.code)
        .filter((code): code is string => Boolean(code)),
    ),
  );

  if (localeCodes.length === 0) {
    return {
      localeHrefs: {},
      languageAlternates: {},
    };
  }

  if (documentType === "page") {
    const segments = await resolvePageSegmentsById(documentId);

    if (!segments) {
      return {
        localeHrefs: {},
        languageAlternates: {},
      };
    }

    const routePath = segments.length === 0 ? "/" : `/${segments.join("/")}`;

    const results = await Promise.all(
      localeCodes.map(async (locale) => ({
        locale,

        exists: Boolean(
          await resolvePageIdBySegments(siteId, locale, segments),
        ),
      })),
    );

    return buildLocaleLinks({
      routePath,
      defaultLocale,
      locales: localeCodes.map((code) => ({ code })),
      availableLocales: results
        .filter((result) => result.exists)
        .map((result) => result.locale),
      domains: domains.length > 0 ? domains : (site?.domains ?? []),
      canonicalDomain: canonicalDomain ?? site?.canonicalDomain,
    });
  }

  const slug = await getBlogSlugById(siteId, documentId);

  if (!slug) {
    return {
      localeHrefs: {},
      languageAlternates: {},
    };
  }

  const availableLocales = await getBlogAvailableLocales(
    siteId,
    localeCodes,
    slug,
  );

  return buildLocaleLinks({
    routePath: `/blog/${slug}`,
    defaultLocale,
    locales: localeCodes.map((code) => ({ code })),
    availableLocales,
    domains: domains.length > 0 ? domains : (site?.domains ?? []),
    canonicalDomain: canonicalDomain ?? site?.canonicalDomain,
  });
}
