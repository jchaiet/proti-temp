import { sanityClient } from "@/sanity/client";

import {
  buildAllSitePublicPaths,
  buildAffectedPagePaths,
  buildAuthorPaths,
  buildBlogPath,
  buildBlogTranslationCounterpartPaths,
  buildPageTranslationCounterpartPaths,
  buildPagePaths,
  buildRedirectPath,
  buildTaxonomyPaths,
  type SitePublicRouteIndex,
} from "./routes";
import type {
  RevalidationDocumentSnapshot,
  RevalidationDocumentType,
  RevalidationPlan,
  SanityRevalidationPayload,
} from "./types";

const MAX_REFERENCE_DEPTH = 8;
const MAX_VISITED_DOCUMENTS = 2000;

const REVERSE_DEPENDENCY_TYPES = [
  "page",
  "blog",
  "singleton",
  "modal",
  "navigationHeader",
  "navigationFooter",
  "navigationSet",
  "author",
  "taxonomy",
  "redirect",
  "site",
];

export const REVERSE_DEPENDENCIES_QUERY = `
  *[
    _type in $types &&
    references($documentId)
  ]{
    _id,
    _type,

    "siteId": select(
      _type == "site" => _id,
      site._ref
    ),

    locale,

    "slug": select(
      _type == "page" => slug,
      _type in ["blog", "author", "taxonomy"] => slug.current
    ),

    "sourcePath": sourcePath,
    "parentId": parent._ref,
    isHomepage,
    key,

    defaultLocale,
    locales[]{code},

    "authorId": author._ref,
    "taxonomyIds": taxonomy[]._ref
  }
`;

export const SITE_PUBLIC_ROUTE_INDEX_QUERY = `
  {
    "site": *[
      _type == "site" &&
      _id == $siteId
    ][0]{
      _id,
      defaultLocale,
      locales[]{code}
    },

    "pages": *[
      _type == "page" &&
      site._ref == $siteId
    ]{
      _id,
      locale,
      slug,
      isHomepage,
      "parentId": parent._ref
    },

    "blogs": *[
      _type == "blog" &&
      site._ref == $siteId
    ]{
      _id,
      locale,
      "slug": slug.current,
      "authorId": author._ref,
      "taxonomyIds": taxonomy[]._ref
    },

    "authors": *[
      _type == "author" &&
      site._ref == $siteId
    ]{
      _id,
      "slug": slug.current
    },

    "taxonomy": *[
      _type == "taxonomy" &&
      site._ref == $siteId
    ]{
      _id,
      "slug": slug.current,
      "parentId": parent._ref
    },

    "redirects": *[
      _type == "redirect" &&
      site._ref == $siteId
    ]{
      _id,
      locale,
      sourcePath
    }
  }
`;

export const DOCUMENTS_BY_ID_QUERY = `
  *[
    _id in $documentIds &&
    _type in ["author", "taxonomy"]
  ]{
    _id,
    _type,
    "siteId": site._ref,
    "slug": slug.current,
    "parentId": parent._ref
  }
`;

export const DYNAMIC_DOCUMENT_LIST_CONSUMERS_QUERY = `
  *[
    _type in ["page", "blog", "singleton"] &&
    site._ref == $siteId &&
    locale in $locales &&
    (
      (
        _type in ["page", "blog"] &&
        count(
          sections[
            _type == "documentListBlock" &&
            sourceMode == "dynamic" &&
            $changedType in dynamicContentTypes
          ]
        ) > 0
      ) ||
      (
        _type == "singleton" &&
        count(
          component[
            _type == "documentListBlock" &&
            sourceMode == "dynamic" &&
            $changedType in dynamicContentTypes
          ]
        ) > 0
      )
    )
  ]{
    _id,
    _type,
    "siteId": site._ref,
    locale,

    "slug": select(
      _type == "page" => slug,
      _type == "blog" => slug.current
    ),

    "parentId": parent._ref,
    isHomepage,
    key,

    "authorId": author._ref,
    "taxonomyIds": taxonomy[]._ref,

    "dynamicLists": select(
      _type == "singleton" => component[
        _type == "documentListBlock" &&
        sourceMode == "dynamic" &&
        $changedType in dynamicContentTypes
      ]{
        "taxonomyIds": dynamicTaxonomy[]._ref,
        "taxonomyMatchLogic": coalesce(dynamicTaxonomyMatchLogic, "any")
      },

      sections[
        _type == "documentListBlock" &&
        sourceMode == "dynamic" &&
        $changedType in dynamicContentTypes
      ]{
        "taxonomyIds": dynamicTaxonomy[]._ref,
        "taxonomyMatchLogic": coalesce(dynamicTaxonomyMatchLogic, "any")
      }
    )
  }
`;

type DependencyRecord = RevalidationDocumentSnapshot;

type DynamicDocumentListConfig = {
  taxonomyIds?: string[];
  taxonomyMatchLogic?: "any" | "all";
};

type DynamicDocumentListConsumer = DependencyRecord & {
  dynamicLists?: DynamicDocumentListConfig[];
};

type RouteIndexCache = Map<string, Promise<SitePublicRouteIndex>>;

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

function unique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

function getDocument(
  payload: SanityRevalidationPayload,
): RevalidationDocumentSnapshot | null {
  return payload.after ?? payload.before ?? null;
}

function sameValue(a?: string, b?: string): boolean {
  return (a ?? "") === (b ?? "");
}

function pageRouteChanged(
  before?: RevalidationDocumentSnapshot | null,
  after?: RevalidationDocumentSnapshot | null,
): boolean {
  if (!before || !after || before._type !== "page" || after._type !== "page") {
    return Boolean(before || after);
  }

  return !(
    sameValue(before.siteId, after.siteId) &&
    sameValue(before.locale, after.locale) &&
    sameValue(before.slug, after.slug) &&
    sameValue(before.parentId, after.parentId) &&
    before.isHomepage === after.isHomepage
  );
}

function blogRouteChanged(
  before?: RevalidationDocumentSnapshot | null,
  after?: RevalidationDocumentSnapshot | null,
): boolean {
  if (!before || !after || before._type !== "blog" || after._type !== "blog") {
    return Boolean(before || after);
  }

  return !(
    sameValue(before.siteId, after.siteId) &&
    sameValue(before.locale, after.locale) &&
    sameValue(before.slug, after.slug)
  );
}

function taxonomyRouteChanged(
  before?: RevalidationDocumentSnapshot | null,
  after?: RevalidationDocumentSnapshot | null,
): boolean {
  if (
    !before ||
    !after ||
    before._type !== "taxonomy" ||
    after._type !== "taxonomy"
  ) {
    return Boolean(before || after);
  }

  return !(
    sameValue(before.siteId, after.siteId) &&
    sameValue(before.slug, after.slug) &&
    sameValue(before.parentId, after.parentId)
  );
}

function siteRoutingChanged(
  before?: RevalidationDocumentSnapshot | null,
  after?: RevalidationDocumentSnapshot | null,
): boolean {
  if (!before || !after || before._type !== "site" || after._type !== "site") {
    return Boolean(before || after);
  }

  const beforeLocales = unique(
    (before.locales ?? []).map((locale) => locale.code ?? "").filter(Boolean),
  );
  const afterLocales = unique(
    (after.locales ?? []).map((locale) => locale.code ?? "").filter(Boolean),
  );

  return !(
    sameValue(before.defaultLocale, after.defaultLocale) &&
    beforeLocales.join("\u0000") === afterLocales.join("\u0000")
  );
}

async function getSiteRouteIndex(
  siteId: string,
  cache: RouteIndexCache,
): Promise<SitePublicRouteIndex> {
  const normalizedSiteId = cleanId(siteId);

  let result = cache.get(normalizedSiteId);

  if (!result) {
    result = sanityClient.fetch<SitePublicRouteIndex>(
      SITE_PUBLIC_ROUTE_INDEX_QUERY,
      {
        siteId: normalizedSiteId,
      },
    );

    cache.set(normalizedSiteId, result);
  }

  return result;
}

async function getDefaultLocale(
  siteId: string,
  cache: RouteIndexCache,
  fallback?: RevalidationDocumentSnapshot,
): Promise<string | null> {
  const index = await getSiteRouteIndex(siteId, cache);

  return index.site?.defaultLocale ?? fallback?.defaultLocale ?? null;
}

async function collectReverseDependencies(
  documentId: string,
): Promise<DependencyRecord[]> {
  const rootId = cleanId(documentId);
  const queue: Array<{ id: string; depth: number }> = [
    { id: rootId, depth: 0 },
  ];
  const visited = new Set<string>([rootId]);
  const dependencies = new Map<string, DependencyRecord>();

  while (queue.length > 0 && visited.size <= MAX_VISITED_DOCUMENTS) {
    const current = queue.shift();

    if (!current || current.depth >= MAX_REFERENCE_DEPTH) {
      continue;
    }

    const records = await sanityClient.fetch<DependencyRecord[]>(
      REVERSE_DEPENDENCIES_QUERY,
      {
        documentId: current.id,
        types: REVERSE_DEPENDENCY_TYPES,
      },
    );

    for (const record of records ?? []) {
      const id = cleanId(record._id);

      if (!id || dependencies.has(id)) {
        continue;
      }

      dependencies.set(id, {
        ...record,
        _id: id,
      });

      if (record._type === "site" || record._type === "redirect") {
        continue;
      }

      if (!visited.has(id) && visited.size < MAX_VISITED_DOCUMENTS) {
        visited.add(id);
        queue.push({ id, depth: current.depth + 1 });
      }
    }
  }

  return Array.from(dependencies.values());
}

async function addSnapshotPath(
  paths: Set<string>,
  snapshot: RevalidationDocumentSnapshot,
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  const siteId = cleanId(
    snapshot.siteId ?? (snapshot._type === "site" ? snapshot._id : ""),
  );

  if (!siteId) {
    return;
  }

  const index = await getSiteRouteIndex(siteId, routeIndexCache);

  switch (snapshot._type) {
    case "page": {
      const pagePaths = buildPagePaths(index, {
        locale: snapshot.locale,
        snapshot,
        onlyId: snapshot._id,
      });

      /*
       * Use the exact page identity where possible. If the route is malformed,
       * buildPagePaths safely omits it.
       */
      const snapshotId = cleanId(snapshot._id);
      const currentPage = (index.pages ?? []).find(
        (page) => cleanId(page._id) === snapshotId,
      );

      if (currentPage || snapshot.slug || snapshot.isHomepage) {
        for (const path of pagePaths) {
          paths.add(path);
        }
      }

      break;
    }

    case "blog": {
      const defaultLocale = await getDefaultLocale(siteId, routeIndexCache);

      if (!defaultLocale) {
        break;
      }

      const path = buildBlogPath(snapshot, defaultLocale);

      if (path) {
        paths.add(path);
      }

      break;
    }

    case "author": {
      const defaultLocale = await getDefaultLocale(siteId, routeIndexCache);

      if (!defaultLocale) {
        break;
      }

      for (const path of buildAuthorPaths(
        snapshot.slug,
        defaultLocale,
        index.site?.locales,
      )) {
        paths.add(path);
      }

      break;
    }

    case "taxonomy": {
      for (const path of buildTaxonomyPaths(index, {
        snapshot,
        onlyId: snapshot._id,
      })) {
        paths.add(path);
      }

      break;
    }

    case "redirect": {
      const defaultLocale = await getDefaultLocale(siteId, routeIndexCache);

      if (!defaultLocale) {
        break;
      }

      const path = buildRedirectPath(snapshot, defaultLocale);

      if (path) {
        paths.add(path);
      }

      break;
    }

    case "modal": {
      /*
       * ModalRegistry is mounted by SiteLayout, so a Modal document is part of
       * every public route for its Site. Keep the invalidation intentionally
       * broad until the registry is narrowed to route-specific Modal IDs.
       */
      for (const path of buildAllSitePublicPaths(index)) {
        paths.add(path);
      }

      break;
    }

    case "site": {
      for (const path of buildAllSitePublicPaths(index, snapshot)) {
        paths.add(path);
      }

      break;
    }
  }
}

async function addCurrentDependencyPath(
  paths: Set<string>,
  dependency: DependencyRecord,
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  if (
    dependency._type === "singleton" ||
    dependency._type === "navigationHeader" ||
    dependency._type === "navigationFooter" ||
    dependency._type === "navigationSet"
  ) {
    return;
  }

  await addSnapshotPath(paths, dependency, routeIndexCache);
}

async function addPageRouteChangePaths(
  paths: Set<string>,
  before: RevalidationDocumentSnapshot | null | undefined,
  after: RevalidationDocumentSnapshot | null | undefined,
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  if (!pageRouteChanged(before, after)) {
    return;
  }

  for (const snapshot of [before, after]) {
    if (snapshot?._type !== "page" || !snapshot.siteId) {
      continue;
    }

    const index = await getSiteRouteIndex(snapshot.siteId, routeIndexCache);

    for (const path of buildAffectedPagePaths(index, snapshot)) {
      paths.add(path);
    }
  }
}

/**
 * Language alternates are computed by matching routes/slugs, not Sanity
 * references. Their existing cached Pages need invalidation whenever a
 * counterpart appears, disappears, or changes its public route.
 */
async function addTranslationCounterpartPaths(
  paths: Set<string>,
  before: RevalidationDocumentSnapshot | null | undefined,
  after: RevalidationDocumentSnapshot | null | undefined,
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  const needsPageCounterparts =
    (before?._type === "page" || after?._type === "page") &&
    pageRouteChanged(before, after);

  const needsBlogCounterparts =
    (before?._type === "blog" || after?._type === "blog") &&
    blogRouteChanged(before, after);

  if (!needsPageCounterparts && !needsBlogCounterparts) {
    return;
  }

  for (const snapshot of [before, after]) {
    if (!snapshot?.siteId) continue;

    const index = await getSiteRouteIndex(snapshot.siteId, routeIndexCache);
    const counterparts = needsPageCounterparts
      ? buildPageTranslationCounterpartPaths(index, snapshot)
      : buildBlogTranslationCounterpartPaths(index, snapshot);

    for (const path of counterparts) {
      paths.add(path);
    }
  }
}

async function addTaxonomyRouteChangePaths(
  paths: Set<string>,
  before: RevalidationDocumentSnapshot | null | undefined,
  after: RevalidationDocumentSnapshot | null | undefined,
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  if (!taxonomyRouteChanged(before, after)) {
    return;
  }

  for (const snapshot of [before, after]) {
    if (snapshot?._type !== "taxonomy" || !snapshot.siteId) {
      continue;
    }

    const index = await getSiteRouteIndex(snapshot.siteId, routeIndexCache);

    for (const path of buildTaxonomyPaths(index, { snapshot })) {
      paths.add(path);
    }
  }
}

async function addSiteRoutingChangePaths(
  paths: Set<string>,
  before: RevalidationDocumentSnapshot | null | undefined,
  after: RevalidationDocumentSnapshot | null | undefined,
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  if (!siteRoutingChanged(before, after)) {
    return;
  }

  for (const snapshot of [before, after]) {
    if (snapshot?._type !== "site") {
      continue;
    }

    const index = await getSiteRouteIndex(snapshot._id, routeIndexCache);

    for (const path of buildAllSitePublicPaths(index, snapshot)) {
      paths.add(path);
    }
  }
}

async function addBlogEditorialParentPaths(
  paths: Set<string>,
  before: RevalidationDocumentSnapshot | null | undefined,
  after: RevalidationDocumentSnapshot | null | undefined,
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  const blogSnapshots = [before, after].filter(
    (snapshot): snapshot is RevalidationDocumentSnapshot =>
      snapshot?._type === "blog",
  );

  if (blogSnapshots.length === 0) {
    return;
  }

  const referencedIds = unique(
    blogSnapshots
      .flatMap((snapshot) => [
        snapshot.authorId ?? "",
        ...(snapshot.taxonomyIds ?? []),
      ])
      .filter(Boolean),
  );

  if (referencedIds.length === 0) {
    return;
  }

  const documents = await sanityClient.fetch<DependencyRecord[]>(
    DOCUMENTS_BY_ID_QUERY,
    {
      documentIds: referencedIds.map(cleanId),
    },
  );

  for (const document of documents ?? []) {
    await addSnapshotPath(paths, document, routeIndexCache);
  }
}

async function addAffectedBlogAuthorPathsForTaxonomy(
  paths: Set<string>,
  rootType: RevalidationDocumentType,
  dependencies: DependencyRecord[],
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  if (rootType !== "taxonomy") {
    return;
  }

  const authorIds = unique(
    dependencies
      .filter((dependency) => dependency._type === "blog")
      .map((dependency) => dependency.authorId ?? "")
      .filter(Boolean),
  );

  if (authorIds.length === 0) {
    return;
  }

  const authors = await sanityClient.fetch<DependencyRecord[]>(
    DOCUMENTS_BY_ID_QUERY,
    {
      documentIds: authorIds.map(cleanId),
    },
  );

  for (const author of authors ?? []) {
    if (author._type === "author") {
      await addSnapshotPath(paths, author, routeIndexCache);
    }
  }
}

async function addAffectedBlogTaxonomyPathsForAuthor(
  paths: Set<string>,
  rootType: RevalidationDocumentType,
  dependencies: DependencyRecord[],
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  if (rootType !== "author") {
    return;
  }

  const taxonomyIds = unique(
    dependencies
      .filter((dependency) => dependency._type === "blog")
      .flatMap((dependency) => dependency.taxonomyIds ?? [])
      .filter(Boolean),
  );

  if (taxonomyIds.length === 0) {
    return;
  }

  const taxonomy = await sanityClient.fetch<DependencyRecord[]>(
    DOCUMENTS_BY_ID_QUERY,
    {
      documentIds: taxonomyIds.map(cleanId),
    },
  );

  for (const item of taxonomy ?? []) {
    if (item._type === "taxonomy") {
      await addSnapshotPath(paths, item, routeIndexCache);
    }
  }
}

function dynamicListMatchesBlog(
  list: DynamicDocumentListConfig,
  blog: RevalidationDocumentSnapshot,
): boolean {
  const selectedTaxonomy = unique(
    (list.taxonomyIds ?? []).map(cleanId).filter(Boolean),
  );

  if (selectedTaxonomy.length === 0) {
    return true;
  }

  const blogTaxonomy = new Set(
    (blog.taxonomyIds ?? []).map(cleanId).filter(Boolean),
  );

  if (list.taxonomyMatchLogic === "all") {
    return selectedTaxonomy.every((taxonomyId) => blogTaxonomy.has(taxonomyId));
  }

  return selectedTaxonomy.some((taxonomyId) => blogTaxonomy.has(taxonomyId));
}

async function addDynamicDocumentListConsumerPaths(
  paths: Set<string>,
  payload: SanityRevalidationPayload,
  rootType: RevalidationDocumentType,
  dependencies: DependencyRecord[],
  routeIndexCache: RouteIndexCache,
): Promise<void> {
  /*
   * Dynamic Document Lists are query dependencies rather than reference
   * dependencies. A newly published Page or Blog can change a
   * Page/Blog/Singleton list even though that consumer never references the
   * new document ID.
   *
   * Page/Blog changes can alter list membership/content directly. Taxonomy
   * changes can alter the tags rendered on Blog cards, so include Blogs that
   * reference the changed Taxonomy as candidate list items too.
   */
  if (rootType !== "page" && rootType !== "blog" && rootType !== "taxonomy") {
    return;
  }

  const candidates: RevalidationDocumentSnapshot[] = [];

  if (rootType === "page" || rootType === "blog") {
    for (const snapshot of [payload.before, payload.after]) {
      if (snapshot?._type === rootType) {
        candidates.push(snapshot);
      }
    }
  }

  if (rootType === "taxonomy") {
    candidates.push(
      ...dependencies.filter((dependency) => dependency._type === "blog"),
    );
  }

  const uniqueCandidates = new Map<string, RevalidationDocumentSnapshot>();

  for (const blog of candidates) {
    const siteId = cleanId(blog.siteId);
    const locale = blog.locale?.trim();

    if (!siteId || !locale) {
      continue;
    }

    const taxonomyKey = unique(
      (blog.taxonomyIds ?? []).map(cleanId).filter(Boolean),
    ).join(",");

    uniqueCandidates.set(
      [cleanId(blog._id), siteId, locale, taxonomyKey].join("\u0000"),
      blog,
    );
  }

  const blogsBySite = new Map<string, RevalidationDocumentSnapshot[]>();

  for (const blog of uniqueCandidates.values()) {
    const siteId = cleanId(blog.siteId);
    const current = blogsBySite.get(siteId) ?? [];

    current.push(blog);
    blogsBySite.set(siteId, current);
  }

  for (const [siteId, blogs] of blogsBySite) {
    const locales = unique(
      blogs.map((blog) => blog.locale?.trim() ?? "").filter(Boolean),
    );

    if (locales.length === 0) {
      continue;
    }

    const consumers = await sanityClient.fetch<DynamicDocumentListConsumer[]>(
      DYNAMIC_DOCUMENT_LIST_CONSUMERS_QUERY,
      {
        siteId,
        locales,
        changedType: rootType === "taxonomy" ? "blog" : rootType,
      },
    );

    for (const consumer of consumers ?? []) {
      const matches = (consumer.dynamicLists ?? []).some((list) =>
        blogs.some(
          (blog) =>
            blog.locale === consumer.locale &&
            dynamicListMatchesBlog(list, blog),
        ),
      );

      if (!matches) {
        continue;
      }

      if (consumer._type === "singleton") {
        const singletonDependencies = await collectReverseDependencies(
          consumer._id,
        );

        for (const dependency of singletonDependencies) {
          await addCurrentDependencyPath(paths, dependency, routeIndexCache);
        }

        continue;
      }

      await addCurrentDependencyPath(paths, consumer, routeIndexCache);
    }
  }
}

function sitemapRelevant(type: RevalidationDocumentType): boolean {
  return ["page", "blog", "author", "taxonomy", "site"].includes(type);
}

export async function resolveRevalidationPlan(
  payload: SanityRevalidationPayload,
): Promise<RevalidationPlan | null> {
  const document = getDocument(payload);

  if (!document?._id || !document._type) {
    return null;
  }

  const documentId = cleanId(document._id);
  const routeIndexCache: RouteIndexCache = new Map();
  const paths = new Set<string>();

  /* Always invalidate the document's old and new public route, if it has one. */
  if (payload.before) {
    await addSnapshotPath(paths, payload.before, routeIndexCache);
  }

  if (payload.after) {
    await addSnapshotPath(paths, payload.after, routeIndexCache);
  }

  const dependencies =
    document._type === "site"
      ? []
      : await collectReverseDependencies(documentId);

  for (const dependency of dependencies) {
    await addCurrentDependencyPath(paths, dependency, routeIndexCache);
  }

  await addPageRouteChangePaths(
    paths,
    payload.before,
    payload.after,
    routeIndexCache,
  );

  await addTranslationCounterpartPaths(
    paths,
    payload.before,
    payload.after,
    routeIndexCache,
  );

  await addTaxonomyRouteChangePaths(
    paths,
    payload.before,
    payload.after,
    routeIndexCache,
  );

  await addSiteRoutingChangePaths(
    paths,
    payload.before,
    payload.after,
    routeIndexCache,
  );

  await addBlogEditorialParentPaths(
    paths,
    payload.before,
    payload.after,
    routeIndexCache,
  );

  await addAffectedBlogAuthorPathsForTaxonomy(
    paths,
    document._type,
    dependencies,
    routeIndexCache,
  );

  await addAffectedBlogTaxonomyPathsForAuthor(
    paths,
    document._type,
    dependencies,
    routeIndexCache,
  );

  await addDynamicDocumentListConsumerPaths(
    paths,
    payload,
    document._type,
    dependencies,
    routeIndexCache,
  );

  if (sitemapRelevant(document._type)) {
    paths.add("/sitemap.xml");
  }

  if (document._type === "site") {
    paths.add("/robots.txt");
  }

  return {
    documentId,
    documentType: document._type,
    paths: unique(paths),
  };
}
