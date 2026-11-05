import { PUBLISHED_SANITY_FETCH_OPTIONS } from "../cache";
import { sanityClient } from "../client";

type PageReference = {
  _ref?: string;
};

type PageUrlData = {
  _id: string;
  slug?: string;
  locale: string;
  isHomepage?: boolean;
  parent?: PageReference;

  site?: {
    _id: string;
    defaultLocale: string;
  };
};

type ParentUrlData = {
  _id: string;
  slug?: string;
  locale?: string;
  site?: PageReference;
  parent?: PageReference;
};

export type GetPageUrlOptions = {
  expectedSiteId?: string;
  expectedLocale?: string;
};

const PAGE_URL_QUERY = `
  *[
    _type == "page" &&
    _id == $pageId
  ][0]{
    _id,
    slug,
    locale,
    isHomepage,
    parent,
    "site": site->{
      _id,
      defaultLocale
    }
  }
`;

const PARENT_URL_QUERY = `
  *[
    _type == "page" &&
    _id == $pageId
  ][0]{
    _id,
    slug,
    locale,
    site,
    parent
  }
`;

function cleanId(id: string): string {
  return id.replace(/^drafts\./, "");
}

export async function getPageUrl(
  pageReference: string,
  options: GetPageUrlOptions = {},
): Promise<string | null> {
  const pageId = cleanId(pageReference);

  const page = await sanityClient.fetch<PageUrlData | null>(
    PAGE_URL_QUERY,
    {
      pageId,
    },
    PUBLISHED_SANITY_FETCH_OPTIONS,
  );

  if (!page?.site?._id || !page.locale) {
    return null;
  }

  const pageSiteId = cleanId(page.site._id);
  const expectedSiteId = options.expectedSiteId
    ? cleanId(options.expectedSiteId)
    : undefined;

  if (expectedSiteId && pageSiteId !== expectedSiteId) {
    return null;
  }

  if (options.expectedLocale && page.locale !== options.expectedLocale) {
    return null;
  }

  if (page.isHomepage) {
    return page.locale === page.site.defaultLocale ? "/" : `/${page.locale}`;
  }

  if (!page.slug) {
    return null;
  }

  const segments: string[] = [page.slug];

  let parentId = page.parent?._ref ? cleanId(page.parent._ref) : undefined;

  const visited = new Set<string>([pageId]);

  let depth = 0;

  while (parentId && depth < 50) {
    if (visited.has(parentId)) {
      return null;
    }

    visited.add(parentId);

    const parent = await sanityClient.fetch<ParentUrlData | null>(
      PARENT_URL_QUERY,
      {
        pageId: parentId,
      },
      PUBLISHED_SANITY_FETCH_OPTIONS,
    );

    if (!parent?.slug) {
      return null;
    }

    if (cleanId(parent.site?._ref ?? "") !== pageSiteId) {
      return null;
    }

    if (parent.locale !== page.locale) {
      return null;
    }

    segments.unshift(parent.slug);

    parentId = parent.parent?._ref ? cleanId(parent.parent._ref) : undefined;

    depth++;
  }

  if (depth >= 50) {
    return null;
  }

  const pagePath = `/${segments.join("/")}`;

  if (page.locale === page.site.defaultLocale) {
    return pagePath;
  }

  return `/${page.locale}${pagePath}`;
}
