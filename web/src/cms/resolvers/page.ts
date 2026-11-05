import type { CmsBlock, CmsImage } from "@/cms/types";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import { PUBLISHED_SANITY_FETCH_OPTIONS } from "@/sanity/cache";
import { sanityClient } from "@/sanity/client";

import type { Page } from "@/sanity/types";

import {
  ACCORDION_BLOCK_FRAGMENT,
  CAROUSEL_BLOCK_FRAGMENT,
  CONTENT_BLOCK_FRAGMENT,
  DOCUMENT_LIST_BLOCK_FRAGMENT,
  FORM_BLOCK_FRAGMENT,
  GRID_BLOCK_FRAGMENT,
  HERO_BLOCK_FRAGMENT,
  RICH_TEXT_BLOCK_FRAGMENT,
  TABS_BLOCK_FRAGMENT,
} from "@/sanity/fragments";

import { IMAGE_FRAGMENT } from "@/sanity/fragments/image";

type PageLookup = {
  _id: string;
};

type ResolvedPageSeo = {
  metaTitle?: string;

  metaDescription?: string;

  socialImageUrl?: string;

  socialImageAlt?: string;

  canonicalUrl?: string;

  indexing?: boolean;

  following?: boolean;
};

type PageQuerySeo = Omit<
  ResolvedPageSeo,
  "socialImageUrl" | "socialImageAlt"
> & {
  socialImage?: CmsImage;
};

type PageQueryRecord = Omit<Page, "seo"> & {
  seo?: PageQuerySeo;

  sections?: CmsBlock[];
};

export type ResolvedPage = Omit<Page, "seo"> & {
  seo?: ResolvedPageSeo;

  sections?: CmsBlock[];
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

const ROOT_PAGE_QUERY = `
  *[
    _type == "page" &&
    site._ref == $siteId &&
    locale == $locale &&
    slug == $slug &&
    !defined(parent) &&
    isHomepage != true
  ][0]{
    _id
  }
`;

const CHILD_PAGE_QUERY = `
  *[
    _type == "page" &&
    site._ref == $siteId &&
    locale == $locale &&
    slug == $slug &&
    parent._ref == $parentId
  ][0]{
    _id
  }
`;

export const PAGE_BY_ID_QUERY = `
  *[
    _type == "page" &&
    _id == $pageId
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

      ${RICH_TEXT_BLOCK_FRAGMENT}
    }
  }
`;

async function getPageById(pageId: string): Promise<ResolvedPage | null> {
  const record = await sanityClient.fetch<PageQueryRecord | null>(
    PAGE_BY_ID_QUERY,
    {
      pageId,
    },
    PUBLISHED_SANITY_FETCH_OPTIONS,
  );

  if (!record) {
    return null;
  }

  const { seo, ...page } = record;

  return {
    ...page,

    seo: seo
      ? {
          ...seo,

          socialImageUrl: resolveSanityImagePreset(seo.socialImage, "social"),

          socialImageAlt: seo.socialImage?.alt ?? "",
        }
      : undefined,
  };
}

export async function resolvePageBySegments(
  siteId: string,
  locale: string,
  segments: string[],
): Promise<ResolvedPage | null> {
  if (segments.length === 0) {
    const homepage = await sanityClient.fetch<PageLookup | null>(
      HOMEPAGE_QUERY,
      {
        siteId,
        locale,
      },
      PUBLISHED_SANITY_FETCH_OPTIONS,
    );

    if (!homepage) {
      return null;
    }

    return getPageById(homepage._id);
  }

  const rootPage = await sanityClient.fetch<PageLookup | null>(
    ROOT_PAGE_QUERY,
    {
      siteId,
      locale,
      slug: segments[0],
    },
    PUBLISHED_SANITY_FETCH_OPTIONS,
  );

  if (!rootPage) {
    return null;
  }

  let currentPageId = rootPage._id;

  for (const slug of segments.slice(1)) {
    const childPage = await sanityClient.fetch<PageLookup | null>(
      CHILD_PAGE_QUERY,
      {
        siteId,
        locale,
        slug,

        parentId: currentPageId,
      },
      PUBLISHED_SANITY_FETCH_OPTIONS,
    );

    if (!childPage) {
      return null;
    }

    currentPageId = childPage._id;
  }

  return getPageById(currentPageId);
}
