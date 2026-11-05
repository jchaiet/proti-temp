import type { Metadata } from "next";

import type {
  CmsImage,
  CmsSeo,
  CmsSiteSeo,
  CmsSiteSeoDefaults,
} from "@/cms/types";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import { siteLocaleToLanguageTag } from "@/lib/routing/locale";
import {
  getSiteOrigin,
  resolveCanonicalPublicUrl,
  toAbsolutePublicUrl,
} from "@/lib/routing/public-url";

import { PUBLISHED_SANITY_FETCH_OPTIONS } from "@/sanity/cache";
import { sanityClient } from "@/sanity/client";

import { SITE_SEO_QUERY } from "@/sanity/queries/seo";

export type SeoContentType = "website" | "article";
type SiteSeoDefaultsRecord = Omit<
  CmsSiteSeoDefaults,
  "socialImageUrl" | "socialImageAlt"
> & {
  socialImage?: CmsImage;
};

type SiteSeoRecord = Omit<CmsSiteSeo, "defaults"> & {
  defaults?: SiteSeoDefaultsRecord;
};

export interface BuildSeoMetadataOptions {
  siteId: string;
  locale: string;

  publicPath: string;

  title?: string;
  description?: string;

  imageUrl?: string;
  imageAlt?: string;

  seo?: CmsSeo;

  isHomepage?: boolean;

  type?: SeoContentType;

  publishedAt?: string;

  modifiedAt?: string;

  /**
   * Article Author URLs. Relative paths are resolved against the
   * Site canonical origin before being emitted as Open Graph authors.
   */
  articleAuthorUrls?: string[];

  /**
   * Localized article tags, typically Taxonomy titles.
   */
  articleTags?: string[];

  /**
   * Absolute hreflang URLs keyed by BCP 47 language tag
   * (plus optional x-default).
   */
  languageAlternates?: Record<string, string>;
}

function cleanText(value?: string): string | undefined {
  const cleaned = value?.trim();

  return cleaned || undefined;
}

function cleanTextArray(values?: string[]): string[] | undefined {
  const cleaned = Array.from(
    new Set(
      (values ?? [])
        .map((value) => cleanText(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return cleaned.length > 0 ? cleaned : undefined;
}

function applyTitleTemplate(title: string, template?: string): string {
  const cleanTemplate = cleanText(template);

  if (!cleanTemplate || !cleanTemplate.includes("%s")) {
    return title;
  }

  return cleanTemplate.replace("%s", title);
}

function resolveTitle(
  site: CmsSiteSeo,
  options: BuildSeoMetadataOptions,
): string | undefined {
  const defaults = site.defaults;

  const explicitTitle = cleanText(options.seo?.metaTitle);

  /*
   * Homepage without an explicit override should prefer
   * the Locale-specific Site Title and should not wrap
   * that Site Title in its own template.
   */
  if (options.isHomepage && !explicitTitle) {
    return (
      cleanText(defaults?.siteTitle) ||
      cleanText(options.title) ||
      cleanText(site.name)
    );
  }

  const documentTitle = explicitTitle || cleanText(options.title);

  if (documentTitle) {
    return applyTitleTemplate(documentTitle, defaults?.titleTemplate);
  }

  return cleanText(defaults?.siteTitle) || cleanText(site.name);
}

function resolveDescription(
  site: CmsSiteSeo,
  options: BuildSeoMetadataOptions,
): string | undefined {
  return (
    cleanText(options.seo?.metaDescription) ||
    cleanText(options.description) ||
    cleanText(site.defaults?.metaDescription)
  );
}

function resolveRobots(site: CmsSiteSeo, seo?: CmsSeo): Metadata["robots"] {
  const indexing =
    seo?.indexing && seo.indexing !== "inherit"
      ? seo.indexing
      : (site.defaults?.indexing ?? "index");

  const following =
    seo?.following && seo.following !== "inherit"
      ? seo.following
      : (site.defaults?.following ?? "follow");

  return {
    index: indexing === "index",

    follow: following === "follow",
  };
}

function getOpenGraphLocale(locale: string): string {
  return siteLocaleToLanguageTag(locale).replace(/-/g, "_");
}

function getOpenGraphAlternateLocales(
  locale: string,
  languageAlternates?: Record<string, string>,
): string[] | undefined {
  const current = getOpenGraphLocale(locale);

  const locales = Array.from(
    new Set(
      Object.keys(languageAlternates ?? {})
        .filter((value) => value !== "x-default")
        .map((value) => value.replace(/-/g, "_"))
        .filter((value) => value && value !== current),
    ),
  );

  return locales.length > 0 ? locales : undefined;
}

function getImage(
  site: CmsSiteSeo,
  options: BuildSeoMetadataOptions,
  origin: string | null | undefined,
): {
  url: string;
  alt?: string;
} | null {
  /*
   * Precedence:
   *
   * 1. Explicit SEO image override
   * 2. Document content image (e.g. Blog Featured Image)
   * 3. Site + Locale SEO default image
   */
  const rawUrl =
    cleanText(options.seo?.socialImageUrl) ||
    cleanText(options.imageUrl) ||
    cleanText(site.defaults?.socialImageUrl);

  const url = toAbsolutePublicUrl(rawUrl, origin);

  if (!url) {
    return null;
  }

  const alt =
    cleanText(options.seo?.socialImageAlt) ||
    cleanText(options.imageAlt) ||
    cleanText(site.defaults?.socialImageAlt);

  return {
    url,
    alt,
  };
}

export async function buildSeoMetadata(
  options: BuildSeoMetadataOptions,
): Promise<Metadata> {
  const record = await sanityClient.fetch<SiteSeoRecord | null>(
    SITE_SEO_QUERY,
    {
      siteId: options.siteId,
      locale: options.locale,
    },
    PUBLISHED_SANITY_FETCH_OPTIONS,
  );

  if (!record) {
    return {};
  }

  const defaults = record.defaults
    ? (() => {
        const { socialImage, ...seoDefaults } = record.defaults;

        return {
          ...seoDefaults,

          socialImageUrl: resolveSanityImagePreset(socialImage, "social"),

          socialImageAlt: socialImage?.alt ?? "",
        };
      })()
    : undefined;

  const site: CmsSiteSeo = {
    ...record,
    defaults,
  };

  const origin = getSiteOrigin(site.domains, site.canonicalDomain);

  const { canonical, isSelfCanonical } = resolveCanonicalPublicUrl({
    origin,
    publicPath: options.publicPath,
    canonicalUrl: options.seo?.canonicalUrl,
  });

  /*
   * hreflang should describe a set of mutually canonical equivalents.
   * If this document explicitly canonicals somewhere else, suppress its
   * language alternates rather than advertising a conflicting cluster.
   */
  const languageAlternates = isSelfCanonical
    ? options.languageAlternates
    : undefined;

  const title = resolveTitle(site, options);

  const description = resolveDescription(site, options);

  const image = getImage(site, options, origin);

  const openGraphAlternateLocales = getOpenGraphAlternateLocales(
    options.locale,
    languageAlternates,
  );

  const openGraphBase = {
    title,
    description,

    url: canonical,

    siteName: cleanText(site.defaults?.siteTitle) || cleanText(site.name),

    locale: getOpenGraphLocale(options.locale),

    ...(openGraphAlternateLocales
      ? {
          alternateLocale: openGraphAlternateLocales,
        }
      : {}),

    ...(image
      ? {
          images: [
            {
              url: image.url,
              ...(image.alt
                ? {
                    alt: image.alt,
                  }
                : {}),
            },
          ],
        }
      : {}),
  };

  const articleAuthors = cleanTextArray(options.articleAuthorUrls)
    ?.map((value) => toAbsolutePublicUrl(value, origin))
    .filter((value): value is string => Boolean(value));

  const articleTags = cleanTextArray(options.articleTags);

  const openGraph: Metadata["openGraph"] =
    options.type === "article"
      ? {
          ...openGraphBase,
          type: "article",

          ...(options.publishedAt
            ? {
                publishedTime: options.publishedAt,
              }
            : {}),

          ...(options.modifiedAt
            ? {
                modifiedTime: options.modifiedAt,
              }
            : {}),

          ...(articleAuthors?.length
            ? {
                authors: articleAuthors,
              }
            : {}),

          ...(articleTags?.length
            ? {
                tags: articleTags,
              }
            : {}),
        }
      : {
          ...openGraphBase,
          type: "website",
        };

  return {
    title,
    description,

    alternates:
      canonical || Object.keys(languageAlternates ?? {}).length > 0
        ? {
            ...(canonical
              ? {
                  canonical,
                }
              : {}),

            ...(Object.keys(languageAlternates ?? {}).length > 0
              ? {
                  languages: languageAlternates,
                }
              : {}),
          }
        : undefined,

    robots: resolveRobots(site, options.seo),

    openGraph,

    twitter: {
      card: image ? "summary_large_image" : "summary",

      title,
      description,

      ...(image
        ? {
            images: [image.url],
          }
        : {}),
    },
  };
}
