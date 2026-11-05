import { cache } from "react";

import type { CmsBlock, CmsImage } from "@/cms/types";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import { sanityFetch } from "@/sanity/fetch";

import type { Page } from "@/sanity/types";

import {
  ACCORDION_BLOCK_FRAGMENT,
  CAROUSEL_BLOCK_FRAGMENT,
  CONTENT_BLOCK_FRAGMENT,
  HERO_BLOCK_FRAGMENT,
  TABS_BLOCK_FRAGMENT,
  FORM_BLOCK_FRAGMENT,
  GRID_BLOCK_FRAGMENT,
  DOCUMENT_LIST_BLOCK_FRAGMENT,
  RICH_TEXT_BLOCK_FRAGMENT,
  SINGLETON_REFERENCE_BLOCK_FRAGMENT,
} from "@/sanity/fragments";

import { IMAGE_FRAGMENT } from "@/sanity/fragments/image";

type PageLookup = {
  _id: string;
};

type PageQueryRecord = Omit<Page, "seo"> & {
  seo?: Omit<NonNullable<Page["seo"]>, "socialImageUrl" | "socialImageAlt"> & {
    socialImage?: CmsImage;
  };

  sections?: CmsBlock[] | null;
};

export type ResolvedPage = Page & {
  sections: CmsBlock[];
};

const HOMEPAGE_QUERY = `
  *[
    _type == "page" &&
    site._ref == $siteId &&
    locale == $locale &&
    isHomepage == true
  ][0]{
    _id
  }
`;

/**
 * A route's slugs can be resolved in one request instead of one request per
 * path segment. Candidate documents are scoped to the requested Site/Locale;
 * their parent references are checked in order below so identical slugs in
 * different branches cannot resolve to the wrong Page.
 */
const PAGE_ROUTE_CANDIDATES_QUERY = `
  *[
    _type == "page" &&
    site._ref == $siteId &&
    locale == $locale &&
    slug in $slugs &&
    isHomepage != true
  ]{
    _id,
    slug,
    parent {
      _ref
    }
  }
`;

type PageRouteCandidate = {
  _id: string;
  slug?: string;
  parent?: { _ref?: string } | null;
};

export const PAGE_BY_ID_QUERY = `
  *[
    _type == "page" &&
    _id == $pageId &&
    site._ref == $siteId &&
    locale == $locale
  ][0] {
    _id,
    title,
    slug,
    locale,
    isHomepage,

    parent {
      _ref
    },

    navigation {
      mode,

      navigationSet {
        _ref
      }
    },

    seo {
      metaTitle,
      metaDescription,

      socialImage {
        ${IMAGE_FRAGMENT}
      },

      canonicalUrl,

      indexing,
      following
    },

    sections[] {
      _key,
      _type,

      ${HERO_BLOCK_FRAGMENT},

      ${CAROUSEL_BLOCK_FRAGMENT},

      ${ACCORDION_BLOCK_FRAGMENT},

      ${CONTENT_BLOCK_FRAGMENT},

      ${TABS_BLOCK_FRAGMENT},

      ${FORM_BLOCK_FRAGMENT},

      ${GRID_BLOCK_FRAGMENT},

      ${DOCUMENT_LIST_BLOCK_FRAGMENT},

      ${RICH_TEXT_BLOCK_FRAGMENT},

      ${SINGLETON_REFERENCE_BLOCK_FRAGMENT}
    }
  }
`;

async function getPageById(
  pageId: string,
  siteId: string,
  locale: string,
  visualEditing = false,
): Promise<ResolvedPage | null> {
  const record = await sanityFetch<PageQueryRecord | null>(
    PAGE_BY_ID_QUERY,
    {
      pageId,
      siteId,
      locale,
    },
    { visualEditing },
  );

  if (!record) {
    return null;
  }

  const { seo, sections, ...page } = record;

  return {
    ...page,

    sections: sections ?? [],

    seo: seo
      ? {
          ...seo,

          socialImageUrl: resolveSanityImagePreset(seo.socialImage, "social"),

          socialImageAlt: seo.socialImage?.alt ?? "",
        }
      : undefined,
  };
}

const cachedGetPageById = cache(getPageById);

type PageRouteLookup = {
  _id: string;
  slug?: string;
  isHomepage?: boolean;

  parent?: {
    _ref?: string;
  };
};

const PAGE_ROUTE_BY_ID_QUERY = `
  *[
    _type == "page" &&
    _id == $pageId
  ][0]{
    _id,
    slug,
    isHomepage,

    parent {
      _ref
    }
  }
`;

async function getPageRouteById(
  pageId: string,
): Promise<PageRouteLookup | null> {
  return sanityFetch<PageRouteLookup | null>(PAGE_ROUTE_BY_ID_QUERY, {
    pageId,
  });
}

/**
 * Resolve only the published Page document ID for a route.
 *
 * This intentionally avoids fetching the Page Builder sections and is used
 * by translation / routing checks where we only need to know whether an
 * equivalent Page exists.
 */
async function resolvePageIdByRouteKey(
  siteId: string,
  locale: string,
  routeKey: string,
): Promise<string | null> {
  const segments = JSON.parse(routeKey) as string[];

  if (segments.length === 0) {
    const homepage = await sanityFetch<PageLookup | null>(HOMEPAGE_QUERY, {
      siteId,
      locale,
    });

    return homepage?._id ?? null;
  }

  const candidates = await sanityFetch<PageRouteCandidate[]>(
    PAGE_ROUTE_CANDIDATES_QUERY,
    {
      siteId,
      locale,
      slugs: Array.from(new Set(segments)),
    },
  );

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  let currentPageId: string | null = null;

  for (const slug of segments) {
    const matchingPage: PageRouteCandidate | undefined = candidates.find(
      (candidate) =>
        candidate.slug === slug &&
        Boolean(candidate._id) &&
        (currentPageId === null
          ? // Root Pages must have no parent object, not merely a missing ref.
            candidate.parent == null
          : candidate.parent?._ref === currentPageId),
    );

    if (!matchingPage) {
      return null;
    }

    currentPageId = matchingPage._id;
  }

  return currentPageId;
}

/*
 * React memoization prevents metadata and route rendering from repeating the
 * same Site/Locale/path lookup in a request. This is not a cross-request
 * cache; Sanity's existing publish/draft cache policy remains unchanged.
 * Stringifying the segments produces the same key for independently created
 * arrays in generateMetadata() and Page().
 */
const cachedResolvePageIdByRouteKey = cache(resolvePageIdByRouteKey);

export async function resolvePageIdBySegments(
  siteId: string,
  locale: string,
  segments: string[],
): Promise<string | null> {
  return cachedResolvePageIdByRouteKey(
    siteId,
    locale,
    JSON.stringify(segments),
  );
}

/**
 * Reconstruct the relative Page route from a published Page document.
 *
 * Example:
 *   Products -> Widget
 * becomes:
 *   ["products", "widget"]
 *
 * The homepage returns an empty array.
 */
export async function resolvePageSegmentsById(
  pageId: string,
): Promise<string[] | null> {
  const page = await getPageRouteById(pageId);

  if (!page) {
    return null;
  }

  if (page.isHomepage === true) {
    return [];
  }

  if (!page.slug) {
    return null;
  }

  const segments = [page.slug];

  let parentId = page.parent?._ref;

  const visited = new Set<string>();

  let depth = 0;

  while (parentId && depth < 50) {
    if (visited.has(parentId)) {
      return null;
    }

    visited.add(parentId);

    const parent = await getPageRouteById(parentId);

    if (!parent || !parent.slug) {
      return null;
    }

    segments.unshift(parent.slug);

    parentId = parent.parent?._ref;
    depth++;
  }

  if (depth >= 50) {
    return null;
  }

  return segments;
}

export async function resolvePageBySegments(
  siteId: string,
  locale: string,
  segments: string[],
  options: { visualEditing?: boolean } = {},
): Promise<ResolvedPage | null> {
  const pageId = await resolvePageIdBySegments(siteId, locale, segments);

  if (!pageId) {
    return null;
  }

  return cachedGetPageById(
    pageId,
    siteId,
    locale,
    options.visualEditing === true,
  );
}
