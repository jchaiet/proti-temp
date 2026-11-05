import {
  buildLocalePublicPath,
  normalizePublicPath,
} from "@/lib/routing/public-url";
import { isReservedPageRoute } from "@/lib/routing/route-shapes";

import type { RevalidationDocumentSnapshot, RevalidationLocale } from "./types";

export type RoutePageRecord = {
  _id: string;
  locale?: string;
  slug?: string;
  parentId?: string;
  isHomepage?: boolean;
};

export type RouteBlogRecord = {
  _id: string;
  locale?: string;
  slug?: string;
  authorId?: string;
  taxonomyIds?: string[];
};

export type RouteAuthorRecord = {
  _id: string;
  slug?: string;
};

export type RouteTaxonomyRecord = {
  _id: string;
  slug?: string;
  parentId?: string;
};

export type RouteRedirectRecord = {
  _id: string;
  locale?: string;
  sourcePath?: string;
};

export interface SitePublicRouteIndex {
  site?: {
    _id?: string;
    defaultLocale?: string;
    locales?: RevalidationLocale[];
  } | null;

  pages?: RoutePageRecord[];
  blogs?: RouteBlogRecord[];
  authors?: RouteAuthorRecord[];
  taxonomy?: RouteTaxonomyRecord[];
  redirects?: RouteRedirectRecord[];
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

function unique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

function localeCodes(locales?: RevalidationLocale[]): string[] {
  return unique(
    (locales ?? [])
      .map((locale) => locale.code?.trim())
      .filter((code): code is string => Boolean(code)),
  );
}

function getPageSegments(
  page: RoutePageRecord,
  pagesById: Map<string, RoutePageRecord>,
): string[] | null {
  if (page.isHomepage === true) {
    return [];
  }

  if (!page.slug || !page.locale) {
    return null;
  }

  const segments = [page.slug];
  const visited = new Set<string>([cleanId(page._id)]);

  let parentId = cleanId(page.parentId);
  let depth = 0;

  while (parentId && depth < 50) {
    if (visited.has(parentId)) {
      return null;
    }

    visited.add(parentId);

    const parent = pagesById.get(parentId);

    if (
      !parent ||
      !parent.slug ||
      parent.isHomepage === true ||
      parent.locale !== page.locale
    ) {
      return null;
    }

    segments.unshift(parent.slug);
    parentId = cleanId(parent.parentId);
    depth++;
  }

  if (depth >= 50) {
    return null;
  }

  return segments;
}

function getTaxonomySegments(
  taxonomy: RouteTaxonomyRecord,
  taxonomyById: Map<string, RouteTaxonomyRecord>,
): string[] | null {
  if (!taxonomy.slug) {
    return null;
  }

  const segments = [taxonomy.slug];
  const visited = new Set<string>([cleanId(taxonomy._id)]);

  let parentId = cleanId(taxonomy.parentId);
  let depth = 0;

  while (parentId && depth < 50) {
    if (visited.has(parentId)) {
      return null;
    }

    visited.add(parentId);

    const parent = taxonomyById.get(parentId);

    if (!parent?.slug) {
      return null;
    }

    segments.unshift(parent.slug);
    parentId = cleanId(parent.parentId);
    depth++;
  }

  if (depth >= 50) {
    return null;
  }

  return segments;
}

function resolveConfig(
  index: SitePublicRouteIndex,
  override?: RevalidationDocumentSnapshot,
): {
  defaultLocale: string;
  locales: string[];
} | null {
  const defaultLocale =
    override?._type === "site"
      ? override.defaultLocale
      : index.site?.defaultLocale;

  const configuredLocales =
    override?._type === "site"
      ? localeCodes(override.locales)
      : localeCodes(index.site?.locales);

  if (!defaultLocale) {
    return null;
  }

  return {
    defaultLocale,
    locales: unique([defaultLocale, ...configuredLocales]),
  };
}

function withSnapshotPage(
  pages: RoutePageRecord[],
  snapshot?: RevalidationDocumentSnapshot,
): RoutePageRecord[] {
  if (snapshot?._type !== "page") {
    return pages;
  }

  const snapshotId = cleanId(snapshot._id);

  return [
    ...pages.filter((page) => cleanId(page._id) !== snapshotId),
    {
      _id: snapshotId,
      locale: snapshot.locale,
      slug: snapshot.slug,
      parentId: snapshot.parentId,
      isHomepage: snapshot.isHomepage,
    },
  ];
}

function withSnapshotTaxonomy(
  taxonomy: RouteTaxonomyRecord[],
  snapshot?: RevalidationDocumentSnapshot,
): RouteTaxonomyRecord[] {
  if (snapshot?._type !== "taxonomy") {
    return taxonomy;
  }

  const snapshotId = cleanId(snapshot._id);

  return [
    ...taxonomy.filter((item) => cleanId(item._id) !== snapshotId),
    {
      _id: snapshotId,
      slug: snapshot.slug,
      parentId: snapshot.parentId,
    },
  ];
}

export function buildPagePaths(
  index: SitePublicRouteIndex,
  {
    locale,
    snapshot,
    siteOverride,
    onlyId,
  }: {
    locale?: string;
    snapshot?: RevalidationDocumentSnapshot;
    siteOverride?: RevalidationDocumentSnapshot;
    onlyId?: string;
  } = {},
): string[] {
  const config = resolveConfig(index, siteOverride);

  if (!config) {
    return [];
  }

  const pages = withSnapshotPage(index.pages ?? [], snapshot);
  const pagesById = new Map(
    pages.map((page) => [cleanId(page._id), page] as const),
  );

  const targetId = cleanId(onlyId);
  const paths: string[] = [];

  for (const page of pages) {
    if (targetId && cleanId(page._id) !== targetId) {
      continue;
    }

    if (!page.locale || (locale && page.locale !== locale)) {
      continue;
    }

    const segments = getPageSegments(page, pagesById);

    if (!segments || (segments.length > 0 && isReservedPageRoute(segments))) {
      continue;
    }

    const path = segments.length === 0 ? "/" : `/${segments.join("/")}`;

    paths.push(
      buildLocalePublicPath({
        locale: page.locale,
        defaultLocale: config.defaultLocale,
        path,
      }),
    );
  }

  return unique(paths);
}

export function buildBlogPath(
  snapshot: Pick<RevalidationDocumentSnapshot, "locale" | "slug">,
  defaultLocale: string,
): string | null {
  if (!snapshot.locale || !snapshot.slug) {
    return null;
  }

  return buildLocalePublicPath({
    locale: snapshot.locale,
    defaultLocale,
    path: `/blog/${snapshot.slug}`,
  });
}

export function buildAuthorPaths(
  slug: string | undefined,
  defaultLocale: string,
  locales: RevalidationLocale[] | string[] | undefined,
): string[] {
  if (!slug) {
    return [];
  }

  const codes = Array.isArray(locales)
    ? unique(
        locales
          .map((locale) =>
            typeof locale === "string" ? locale : locale.code?.trim(),
          )
          .filter((code): code is string => Boolean(code)),
      )
    : [];

  return codes.map((locale) =>
    buildLocalePublicPath({
      locale,
      defaultLocale,
      path: `/authors/${slug}`,
    }),
  );
}

export function buildTaxonomyPaths(
  index: SitePublicRouteIndex,
  {
    snapshot,
    siteOverride,
    onlyId,
  }: {
    snapshot?: RevalidationDocumentSnapshot;
    siteOverride?: RevalidationDocumentSnapshot;
    onlyId?: string;
  } = {},
): string[] {
  const config = resolveConfig(index, siteOverride);

  if (!config) {
    return [];
  }

  const taxonomy = withSnapshotTaxonomy(index.taxonomy ?? [], snapshot);
  const taxonomyById = new Map(
    taxonomy.map((item) => [cleanId(item._id), item] as const),
  );

  const targetId = cleanId(onlyId);
  const paths: string[] = [];

  for (const item of taxonomy) {
    if (targetId && cleanId(item._id) !== targetId) {
      continue;
    }

    const segments = getTaxonomySegments(item, taxonomyById);

    /*
     * /blog/<slug> belongs to Blog detail routing. Taxonomy routes become
     * public only when their hierarchy contributes at least two segments.
     */
    if (!segments || segments.length < 2) {
      continue;
    }

    const routePath = `/blog/${segments.join("/")}`;

    for (const locale of config.locales) {
      paths.push(
        buildLocalePublicPath({
          locale,
          defaultLocale: config.defaultLocale,
          path: routePath,
        }),
      );
    }
  }

  return unique(paths);
}

export function buildRedirectPath(
  snapshot: Pick<RevalidationDocumentSnapshot, "locale" | "sourcePath">,
  defaultLocale: string,
): string | null {
  if (!snapshot.locale || !snapshot.sourcePath) {
    return null;
  }

  return buildLocalePublicPath({
    locale: snapshot.locale,
    defaultLocale,
    path: normalizePublicPath(snapshot.sourcePath),
  });
}

export function buildAllSitePublicPaths(
  index: SitePublicRouteIndex,
  siteOverride?: RevalidationDocumentSnapshot,
): string[] {
  const config = resolveConfig(index, siteOverride);

  if (!config) {
    return [];
  }

  const paths = new Set<string>(
    buildPagePaths(index, {
      siteOverride,
    }),
  );

  for (const blog of index.blogs ?? []) {
    const path = buildBlogPath(blog, config.defaultLocale);

    if (path) {
      paths.add(path);
    }
  }

  for (const redirect of index.redirects ?? []) {
    const path = buildRedirectPath(redirect, config.defaultLocale);

    if (path) {
      paths.add(path);
    }
  }

  for (const author of index.authors ?? []) {
    for (const path of buildAuthorPaths(
      author.slug,
      config.defaultLocale,
      config.locales,
    )) {
      paths.add(path);
    }
  }

  for (const path of buildTaxonomyPaths(index, { siteOverride })) {
    paths.add(path);
  }

  for (const locale of config.locales) {
    paths.add(
      buildLocalePublicPath({
        locale,
        defaultLocale: config.defaultLocale,
        path: "/search",
      }),
    );
  }

  return unique(paths);
}

/**
 * When a Page is published, unpublished, or moves to a different route,
 * its same-path translations may gain or lose hreflang / language-switcher
 * links. Those Pages do not reference each other in Sanity, so reverse
 * reference traversal alone cannot invalidate them.
 *
 * Reconstruct the changed Page's route and its descendants using the
 * webhook snapshot (important for deletes and parent slug changes), then
 * limit invalidation to changed routes and their existing counterparts.
 */
function getAffectedPageRoutePaths(
  index: SitePublicRouteIndex,
  snapshot: RevalidationDocumentSnapshot,
): string[] {
  if (snapshot._type !== "page" || !snapshot.locale) {
    return [];
  }

  const pages = withSnapshotPage(index.pages ?? [], snapshot);
  const pagesById = new Map(
    pages.map((page) => [cleanId(page._id), page] as const),
  );
  const changedId = cleanId(snapshot._id);
  const affectedRoutePaths = new Set<string>();

  for (const page of pages) {
    if (page.locale !== snapshot.locale) {
      continue;
    }

    // A changed parent can also change the routes of every descendant.
    let currentId = cleanId(page._id);
    const visited = new Set<string>();
    let isAffected = false;

    for (let depth = 0; currentId && depth < 50; depth++) {
      if (visited.has(currentId)) break;
      if (currentId === changedId) {
        isAffected = true;
        break;
      }

      visited.add(currentId);
      currentId = cleanId(pagesById.get(currentId)?.parentId);
    }

    if (!isAffected) {
      continue;
    }

    const segments = getPageSegments(page, pagesById);

    if (!segments || (segments.length > 0 && isReservedPageRoute(segments))) {
      continue;
    }

    affectedRoutePaths.add(
      segments.length === 0 ? "/" : `/${segments.join("/")}`,
    );
  }

  return unique(affectedRoutePaths);
}

/** Invalidate only a changed Page's public route and its descendants. */
export function buildAffectedPagePaths(
  index: SitePublicRouteIndex,
  snapshot: RevalidationDocumentSnapshot,
): string[] {
  const config = resolveConfig(index);
  const locale = snapshot.locale;

  if (!config || !locale) {
    return [];
  }

  return getAffectedPageRoutePaths(index, snapshot).map((routePath) =>
    buildLocalePublicPath({
      locale,
      defaultLocale: config.defaultLocale,
      path: routePath,
    }),
  );
}

export function buildPageTranslationCounterpartPaths(
  index: SitePublicRouteIndex,
  snapshot: RevalidationDocumentSnapshot,
): string[] {
  const config = resolveConfig(index);

  if (!config || !snapshot.locale) {
    return [];
  }

  const affectedRoutePaths = getAffectedPageRoutePaths(index, snapshot);

  if (affectedRoutePaths.length === 0) {
    return [];
  }

  const counterparts = new Set<string>();

  for (const locale of config.locales) {
    if (locale === snapshot.locale) continue;

    const existing = new Set(buildPagePaths(index, { locale }));

    for (const routePath of affectedRoutePaths) {
      const candidate = buildLocalePublicPath({
        locale,
        defaultLocale: config.defaultLocale,
        path: routePath,
      });

      if (existing.has(candidate)) {
        counterparts.add(candidate);
      }
    }
  }

  return unique(counterparts);
}

/**
 * Blog translations share their slug, but have no direct references to
 * other locales. A create/delete or slug change affects the published
 * language links on any Blog with the same slug in another Locale.
 */
export function buildBlogTranslationCounterpartPaths(
  index: SitePublicRouteIndex,
  snapshot: RevalidationDocumentSnapshot,
): string[] {
  if (snapshot._type !== "blog" || !snapshot.slug || !snapshot.locale) {
    return [];
  }

  const config = resolveConfig(index);

  if (!config) {
    return [];
  }

  return unique(
    (index.blogs ?? [])
      .filter(
        (blog) =>
          blog.locale !== snapshot.locale &&
          blog.slug === snapshot.slug &&
          config.locales.includes(blog.locale ?? ""),
      )
      .map((blog) => buildBlogPath(blog, config.defaultLocale))
      .filter((path): path is string => Boolean(path)),
  );
}
