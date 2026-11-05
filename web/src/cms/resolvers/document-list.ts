import type { DocumentItem } from "mino-ui/blocks/DocumentListBlock";

import type {
  CmsDocumentListDynamicContentType,
  CmsDocumentListDynamicSort,
  CmsDocumentListTaxonomyMatchLogic,
  CmsDynamicDocumentListItem,
} from "@/cms/types";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";
import { CARD_IMAGE_PRESET_SIZE } from "@/cms/resolvers/image-presets";

import { sanityFetch } from "@/sanity/fetch";

import { getDynamicDocumentListQuery } from "@/sanity/queries/documentList";

const SANITY_DOCUMENT_TYPES: Record<CmsDocumentListDynamicContentType, string> =
  {
    page: "page",
    article: "article",
    blog: "blog",
    news: "news",
    resource: "resource",
  };

const CONTENT_ROUTE_PREFIXES: Record<
  Exclude<CmsDocumentListDynamicContentType, "page">,
  string
> = {
  article: "articles",
  blog: "blog",
  news: "news",
  resource: "resources",
};

export interface ResolveDynamicDocumentListOptions {
  siteId: string;

  locale: string;

  localePrefix?: string;

  contentTypes: CmsDocumentListDynamicContentType[];

  /**
   * Clean published Taxonomy document IDs.
   */
  taxonomyIds?: string[];

  taxonomyMatchLogic?: CmsDocumentListTaxonomyMatchLogic;

  sort: CmsDocumentListDynamicSort;

  limit: number;

  visualEditing?: boolean;
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

/**
 * Fetch Page ancestors in batches rather than issuing one query for every card.
 * The initial listing already includes each Page's own slug and parent ID.
 * Parent lookups are restricted to the same Site + locale to avoid cross-site
 * links and use the same published/draft perspective as the listing itself.
 */
type PagePathNode = Pick<
  CmsDynamicDocumentListItem,
  "_id" | "slug" | "isHomepage" | "parentId"
>;

const PAGE_ANCESTORS_QUERY = `
  *[
    _type == "page" &&
    _id in $pageIds &&
    site._ref == $siteId &&
    locale == $locale
  ]{
    _id,
    slug,
    isHomepage,
    "parentId": parent._ref
  }
`;

const MAX_PAGE_DEPTH = 50;

async function loadPageAncestors(
  items: CmsDynamicDocumentListItem[],
  siteId: string,
  locale: string,
  visualEditing: boolean,
): Promise<Map<string, PagePathNode>> {
  const pages = items.filter((item) => item._type === "page");
  const known = new Map<string, PagePathNode>(
    pages.map((page) => [cleanId(page._id), page]),
  );
  const requested = new Set<string>();
  let parentIds = new Set(
    pages.map((page) => cleanId(page.parentId)).filter(Boolean),
  );

  for (let depth = 0; depth < MAX_PAGE_DEPTH; depth++) {
    const missing = [...parentIds].filter(
      (id) => !known.has(id) && !requested.has(id),
    );

    if (!missing.length) break;

    missing.forEach((id) => requested.add(id));

    const parents = await sanityFetch<PagePathNode[]>(
      PAGE_ANCESTORS_QUERY,
      { siteId, locale, pageIds: missing },
      { visualEditing },
    );

    parentIds = new Set<string>();

    for (const parent of parents) {
      const id = cleanId(parent._id);

      // Sanity enforces the Site/locale restriction in PAGE_ANCESTORS_QUERY.
      if (!requested.has(id)) continue;

      known.set(id, parent);

      if (parent.parentId) {
        parentIds.add(cleanId(parent.parentId));
      }
    }
  }

  return known;
}

function resolvePagePath(
  page: CmsDynamicDocumentListItem,
  pages: Map<string, PagePathNode>,
): string | null {
  if (page.isHomepage) {
    return page.parentId ? null : "/";
  }

  const segments: string[] = [];
  const visited = new Set<string>();
  let current: PagePathNode | undefined = page;

  for (let depth = 0; current && depth < MAX_PAGE_DEPTH; depth++) {
    const id = cleanId(current._id);

    if (visited.has(id) || current.isHomepage || !current.slug?.trim()) {
      return null;
    }

    visited.add(id);
    segments.unshift(current.slug);

    if (!current.parentId) {
      return `/${segments.join("/")}`;
    }

    current = pages.get(cleanId(current.parentId));
  }

  // Missing/unpublished parents, cycles, and excessively deep hierarchies
  // should never produce a plausible but incorrect public URL.
  return null;
}

function normalizePath(path: string): string {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeLocalePrefix(prefix?: string): string {
  if (!prefix) return "";
  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return normalized.replace(/\/+$/, "");
}

function applyLocalePrefix(path: string, localePrefix?: string): string {
  const normalizedPath = normalizePath(path);
  const normalizedPrefix = normalizeLocalePrefix(localePrefix);

  if (!normalizedPath) return "";
  if (normalizedPath === "/") return normalizedPrefix || "/";
  if (!normalizedPrefix) return normalizedPath;

  if (
    normalizedPath === normalizedPrefix ||
    normalizedPath.startsWith(`${normalizedPrefix}/`)
  ) {
    return normalizedPath;
  }

  return `${normalizedPrefix}${normalizedPath}`;
}

function resolveDynamicHref(
  item: CmsDynamicDocumentListItem,
  localePrefix: string | undefined,
  pages: Map<string, PagePathNode>,
): string {
  if (item._type === "page") {
    const pagePath = resolvePagePath(item, pages);
    return pagePath ? applyLocalePrefix(pagePath, localePrefix) : "";
  }

  if (item.path) {
    return applyLocalePrefix(item.path, localePrefix);
  }

  if (!item.slug) return "";

  return applyLocalePrefix(
    `/${CONTENT_ROUTE_PREFIXES[item._type]}/${item.slug}`,
    localePrefix,
  );
}

function mapDynamicItem(
  item: CmsDynamicDocumentListItem,
  localePrefix: string | undefined,
  pages: Map<string, PagePathNode>,
): DocumentItem | null {
  if (!item.title) {
    return null;
  }

  const url = resolveDynamicHref(item, localePrefix, pages);

  // A Page without a valid, published ancestor chain has no navigable route.
  if (item._type === "page" && !url) return null;

  const isResource = item._type === "resource";
  const thumbnail = resolveSanityImagePreset(item.thumbnailImage, "card");

  return {
    id: item._id,

    contentType: item._type,

    cardType: isResource ? "resource" : "article",

    title: item.title,

    summary: item.summary,

    url,

    date: item.date,

    thumbnail,
    ...(item.thumbnailImage?.asset?._ref && thumbnail
      ? {
          thumbnailWidth: CARD_IMAGE_PRESET_SIZE.width,
          thumbnailHeight: CARD_IMAGE_PRESET_SIZE.height,
          ...(item.thumbnailImage.alt
            ? { thumbnailAlt: item.thumbnailImage.alt }
            : {}),
        }
      : {}),

    tags: item.taxonomy?.map((term) => term.title).filter(Boolean),

    fileType: item.fileType,

    fileSize: item.fileSize,
  };
}

export async function resolveDynamicDocumentList(
  options: ResolveDynamicDocumentListOptions,
): Promise<DocumentItem[]> {
  const {
    siteId,
    locale,
    localePrefix,
    contentTypes,
    taxonomyIds = [],
    taxonomyMatchLogic = "any",
    sort,
    limit,
    visualEditing = false,
  } = options;

  if (!siteId || !locale || !contentTypes.length) {
    return [];
  }

  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const sanityTypes = contentTypes.map((type) => SANITY_DOCUMENT_TYPES[type]);

  const normalizedTaxonomyIds = Array.from(
    new Set(taxonomyIds.map(cleanId).filter(Boolean)),
  );

  const query = getDynamicDocumentListQuery(sort);

  const results = await sanityFetch<CmsDynamicDocumentListItem[]>(
    query,
    {
      siteId,
      locale,

      types: sanityTypes,

      taxonomyIds: normalizedTaxonomyIds,

      taxonomyMatchLogic: taxonomyMatchLogic === "all" ? "all" : "any",

      limit: safeLimit,
    },
    { visualEditing },
  );

  const pages = await loadPageAncestors(results, siteId, locale, visualEditing);

  return results
    .map((item) => mapDynamicItem(item, localePrefix, pages))
    .filter((item): item is DocumentItem => item !== null);
}
