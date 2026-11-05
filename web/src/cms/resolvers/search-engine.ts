import type { MetadataRoute } from "next";

import {
  buildLocalePublicPath,
  getSiteOrigin,
  publicUrlsMatch,
  toAbsolutePublicUrl,
} from "@/lib/routing/public-url";
import { isReservedPageRoute } from "@/lib/routing/route-shapes";

import { PUBLISHED_SANITY_FETCH_OPTIONS } from "@/sanity/cache";
import { sanityClient } from "@/sanity/client";

import {
  SEARCH_SITE_BY_HOST_QUERY,
  SITEMAP_AUTHORS_QUERY,
  SITEMAP_BLOGS_QUERY,
  SITEMAP_PAGES_QUERY,
  SITEMAP_TAXONOMY_QUERY,
} from "@/sanity/queries/search-engine";

type SeoIndexing = "inherit" | "index" | "noindex";

type SiteLocale = {
  code?: string;
};

type SiteSeoDefault = {
  locale?: string;
  indexing?: "index" | "noindex";
};

type SearchSite = {
  _id: string;
  name?: string;

  domains?: string[];
  canonicalDomain?: string;

  defaultLocale: string;

  locales?: SiteLocale[];

  seoDefaults?: SiteSeoDefault[];
};

type SitemapSeo = {
  canonicalUrl?: string;
  indexing?: SeoIndexing;
};

type SitemapPage = {
  _id: string;
  _updatedAt?: string;

  locale: string;

  slug?: string;
  isHomepage?: boolean;

  parentId?: string;

  seo?: SitemapSeo;
};

type SitemapBlog = {
  _id: string;
  _updatedAt?: string;

  lastModifiedAt?: string;

  locale: string;
  slug?: string;

  seo?: SitemapSeo;
};

type SitemapTaxonomy = {
  _id: string;
  _updatedAt?: string;

  slug?: string;

  parentId?: string;
};

type SitemapAuthor = {
  _id: string;
  _updatedAt?: string;

  slug?: string;

  translations?: Array<{
    locale?: string;
    name?: string;
  }>;
};

type SitemapEntry = MetadataRoute.Sitemap[number];

const publishedClient = sanityClient.withConfig({
  perspective: "published",
});

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

function normalizeHost(host: string): {
  host: string;
  hostname: string;
} {
  const first = host.split(",")[0]?.trim().toLowerCase() ?? "";

  if (!first) {
    return {
      host: "",
      hostname: "",
    };
  }

  /*
   * Preserve the full host for authored localhost:3000
   * domains, but also provide a port-free hostname.
   */
  const hostname = first.startsWith("[")
    ? first.replace(/^\[([^\]]+)\](?::\d+)?$/, "$1")
    : first.replace(/:\d+$/, "");

  return {
    host: first,
    hostname,
  };
}

function getLocaleDefaultIndexing(
  site: SearchSite,
  locale: string,
): "index" | "noindex" {
  return (
    site.seoDefaults?.find((item) => item.locale === locale)?.indexing ??
    "index"
  );
}

function shouldIndex(
  site: SearchSite,
  locale: string,
  seo?: SitemapSeo,
): boolean {
  if (seo?.indexing && seo.indexing !== "inherit") {
    return seo.indexing === "index";
  }

  return getLocaleDefaultIndexing(site, locale) === "index";
}

function canonicalMatches(
  canonicalUrl: string | undefined,
  publicUrl: string,
): boolean {
  if (!canonicalUrl?.trim()) {
    return true;
  }

  if (!/^https?:\/\//i.test(canonicalUrl.trim())) {
    return false;
  }

  const canonical = toAbsolutePublicUrl(canonicalUrl, null);

  return Boolean(canonical && publicUrlsMatch(canonical, publicUrl));
}

function buildPagePath(
  page: SitemapPage,
  pagesById: Map<string, SitemapPage>,
): string | null {
  if (page.isHomepage) {
    return "/";
  }

  const segments: string[] = [];
  const visited = new Set<string>();

  let current: SitemapPage | undefined = page;

  while (current) {
    const currentId = cleanId(current._id);

    if (current.locale !== page.locale) {
      return null;
    }

    if (current !== page && current.isHomepage) {
      return null;
    }

    if (!currentId || visited.has(currentId)) {
      return null;
    }

    visited.add(currentId);

    if (!current.isHomepage) {
      if (!current.slug) {
        return null;
      }

      segments.unshift(current.slug);
    }

    const parentId = cleanId(current.parentId);

    if (!parentId) {
      break;
    }

    current = pagesById.get(parentId);

    if (!current) {
      return null;
    }
  }

  return `/${segments.join("/")}`;
}

function buildTaxonomyPath(
  taxonomy: SitemapTaxonomy,
  taxonomyById: Map<string, SitemapTaxonomy>,
): string[] | null {
  const segments: string[] = [];
  const visited = new Set<string>();

  let current: SitemapTaxonomy | undefined = taxonomy;

  while (current) {
    const currentId = cleanId(current._id);

    if (!currentId || visited.has(currentId)) {
      return null;
    }

    visited.add(currentId);

    if (!current.slug) {
      return null;
    }

    segments.unshift(current.slug);

    const parentId = cleanId(current.parentId);

    if (!parentId) {
      break;
    }

    current = taxonomyById.get(parentId);

    if (!current) {
      return null;
    }
  }

  return segments;
}

function toLastModified(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function resolveSearchSiteByHost(
  requestHost: string,
): Promise<SearchSite | null> {
  const { host, hostname } = normalizeHost(requestHost);

  if (!host) {
    return null;
  }

  return publishedClient.fetch<SearchSite | null>(
    SEARCH_SITE_BY_HOST_QUERY,
    {
      host,
      hostname,
    },
    PUBLISHED_SANITY_FETCH_OPTIONS,
  );
}

export async function buildSiteSitemap(
  requestHost: string,
): Promise<MetadataRoute.Sitemap> {
  const site = await resolveSearchSiteByHost(requestHost);

  if (!site) {
    return [];
  }

  const origin = getSiteOrigin(site.domains, site.canonicalDomain);

  if (!origin) {
    return [];
  }

  const [pages, blogs, taxonomy, authors] = await Promise.all([
    publishedClient.fetch<SitemapPage[]>(
      SITEMAP_PAGES_QUERY,
      {
        siteId: site._id,
      },
      PUBLISHED_SANITY_FETCH_OPTIONS,
    ),

    publishedClient.fetch<SitemapBlog[]>(
      SITEMAP_BLOGS_QUERY,
      {
        siteId: site._id,
      },
      PUBLISHED_SANITY_FETCH_OPTIONS,
    ),

    publishedClient.fetch<SitemapTaxonomy[]>(
      SITEMAP_TAXONOMY_QUERY,
      {
        siteId: site._id,
      },
      PUBLISHED_SANITY_FETCH_OPTIONS,
    ),

    publishedClient.fetch<SitemapAuthor[]>(
      SITEMAP_AUTHORS_QUERY,
      {
        siteId: site._id,
      },
      PUBLISHED_SANITY_FETCH_OPTIONS,
    ),
  ]);

  const supportedLocaleCodes = Array.from(
    new Set(
      (site.locales ?? [])
        .map((item) => item.code)
        .filter((code): code is string => Boolean(code)),
    ),
  );

  const supportedLocales = new Set(supportedLocaleCodes);

  const entries: SitemapEntry[] = [];

  /*
   * Pages
   */
  const pagesById = new Map(pages.map((page) => [cleanId(page._id), page]));

  for (const page of pages) {
    if (!supportedLocales.has(page.locale)) {
      continue;
    }

    if (!shouldIndex(site, page.locale, page.seo)) {
      continue;
    }

    const path = buildPagePath(page, pagesById);

    if (!path) {
      continue;
    }

    const segments = path.split("/").filter(Boolean);

    if (isReservedPageRoute(segments)) {
      continue;
    }

    const publicPath = buildLocalePublicPath({
      locale: page.locale,
      defaultLocale: site.defaultLocale,
      path,
    });

    const url = toAbsolutePublicUrl(publicPath, origin);

    if (!url) {
      continue;
    }

    if (!canonicalMatches(page.seo?.canonicalUrl, url)) {
      continue;
    }

    entries.push({
      url,
      lastModified: toLastModified(page._updatedAt),
    });
  }

  /*
   * Blog detail routes
   */
  for (const blog of blogs) {
    if (!blog.slug || !supportedLocales.has(blog.locale)) {
      continue;
    }

    if (!shouldIndex(site, blog.locale, blog.seo)) {
      continue;
    }

    const path = buildLocalePublicPath({
      locale: blog.locale,
      defaultLocale: site.defaultLocale,
      path: `/blog/${blog.slug}`,
    });

    const url = toAbsolutePublicUrl(path, origin);

    if (!url) {
      continue;
    }

    if (!canonicalMatches(blog.seo?.canonicalUrl, url)) {
      continue;
    }

    entries.push({
      url,
      lastModified: toLastModified(blog.lastModifiedAt ?? blog._updatedAt),
    });
  }

  /*
   * Taxonomy landing routes.
   *
   * Taxonomy is shared at the Site level. Its title / description are
   * localized inside the document, while the slug hierarchy stays the same.
   * Emit each routable Taxonomy path once for every indexable Site locale.
   *
   * The current router only treats /blog/<root>/<child> and deeper paths
   * as Taxonomy pages. Root-only terms still collide with /blog/<blog-slug>
   * and are intentionally excluded.
   */
  const taxonomyById = new Map(
    taxonomy.map((item) => [cleanId(item._id), item]),
  );

  for (const item of taxonomy) {
    const segments = buildTaxonomyPath(item, taxonomyById);

    if (!segments || segments.length < 2) {
      continue;
    }

    for (const locale of supportedLocaleCodes) {
      if (getLocaleDefaultIndexing(site, locale) === "noindex") {
        continue;
      }

      const path = buildLocalePublicPath({
        locale,
        defaultLocale: site.defaultLocale,
        path: `/blog/${segments.join("/")}`,
      });

      const url = toAbsolutePublicUrl(path, origin);

      if (!url) {
        continue;
      }

      entries.push({
        url,
        lastModified: toLastModified(item._updatedAt),
      });
    }
  }

  /*
   * Generated Author profile routes. Authors are shared Site-level records
   * with embedded translations, so every configured/indexable locale has a
   * generated profile URL at the same slug.
   */
  for (const author of authors) {
    if (!author.slug) {
      continue;
    }

    const availableAuthorLocales = new Set([
      site.defaultLocale,
      ...(author.translations ?? [])
        .filter((translation) => Boolean(translation.name?.trim()))
        .map((translation) => translation.locale)
        .filter((locale): locale is string => Boolean(locale)),
    ]);

    for (const locale of supportedLocaleCodes) {
      if (!availableAuthorLocales.has(locale)) {
        continue;
      }

      if (getLocaleDefaultIndexing(site, locale) === "noindex") {
        continue;
      }

      const path = buildLocalePublicPath({
        locale,
        defaultLocale: site.defaultLocale,
        path: `/authors/${author.slug}`,
      });

      const url = toAbsolutePublicUrl(path, origin);

      if (!url) {
        continue;
      }

      entries.push({
        url,
        lastModified: toLastModified(author._updatedAt),
      });
    }
  }

  /*
   * Protect against accidental duplicates.
   */
  const unique = new Map<string, SitemapEntry>();

  for (const entry of entries) {
    unique.set(entry.url, entry);
  }

  return Array.from(unique.values()).sort((a, b) => a.url.localeCompare(b.url));
}

export async function buildRobotsConfig(
  requestHost: string,
): Promise<MetadataRoute.Robots> {
  const site = await resolveSearchSiteByHost(requestHost);

  /*
   * Unknown hosts should not be crawled.
   */
  if (!site) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  const origin = getSiteOrigin(site.domains, site.canonicalDomain);

  if (!origin) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  /*
   * Do not convert per-document `noindex` into robots.txt
   * Disallow rules. Search engines need to be able to crawl
   * those documents to see their noindex meta directive.
   */
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },

    sitemap: `${origin}/sitemap.xml`,
  };
}
