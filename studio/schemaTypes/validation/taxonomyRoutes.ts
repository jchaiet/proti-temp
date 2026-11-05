import type {ValidationContext} from 'sanity'

import {cleanId, isDraftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type SlugValue = {
  current?: string
}

type TaxonomyDocument = {
  _id: string
  _createdAt?: string
  title?: string
  site?: ReferenceValue
  parent?: ReferenceValue
  slug?: SlugValue
}

type BlogDocument = {
  _id: string
  title?: string
  locale?: string
}

type TaxonomyLogicalDocument = {
  id: string
  published?: TaxonomyDocument
  draft?: TaxonomyDocument
  current?: TaxonomyDocument
}

type TaxonomyRouteState = {
  id: string
  label: string
  publishedPath?: string
  projectedPath?: string
  publishedCreatedAt?: string
  projectedCreatedAt?: string
}

function dateValue(value?: string): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER
  }

  const parsed = Date.parse(value)

  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}

function documentLabel(document: TaxonomyDocument | undefined, fallback: string): string {
  const title = document?.title?.trim()

  return title ? `"${title}"` : fallback
}

function sortRouteOwners(
  left: TaxonomyRouteState,
  right: TaxonomyRouteState,
  mode: 'published' | 'projected',
): number {
  const leftDate =
    mode === 'published' ? dateValue(left.publishedCreatedAt) : dateValue(left.projectedCreatedAt)

  const rightDate =
    mode === 'published' ? dateValue(right.publishedCreatedAt) : dateValue(right.projectedCreatedAt)

  if (leftDate !== rightDate) {
    return leftDate - rightDate
  }

  return left.id.localeCompare(right.id)
}

function buildLogicalTaxonomyDocuments(
  documents: TaxonomyDocument[],
  current: TaxonomyDocument,
): Map<string, TaxonomyLogicalDocument> {
  const logical = new Map<string, TaxonomyLogicalDocument>()

  for (const document of documents) {
    const id = cleanId(document._id)

    if (!id) {
      continue
    }

    const entry = logical.get(id) ?? {
      id,
    }

    if (isDraftId(document._id)) {
      entry.draft = document
    } else {
      entry.published = document
    }

    logical.set(id, entry)
  }

  const currentId = cleanId(current._id)

  if (currentId) {
    const entry = logical.get(currentId) ?? {
      id: currentId,
    }

    /*
     * Always use the document currently being edited as the projected state.
     * This avoids relying on the client query having received the latest local
     * Studio patch before validation runs.
     */
    entry.current = current

    logical.set(currentId, entry)
  }

  return logical
}

function projectedDocument(
  entry: TaxonomyLogicalDocument | undefined,
): TaxonomyDocument | undefined {
  return entry?.current ?? entry?.draft ?? entry?.published
}

function resolveTaxonomyPath(
  id: string,
  logical: Map<string, TaxonomyLogicalDocument>,
  mode: 'published' | 'projected',
  memo: Map<string, string | undefined>,
  stack: Set<string> = new Set(),
): string | undefined {
  const memoKey = `${mode}:${id}`

  if (memo.has(memoKey)) {
    return memo.get(memoKey)
  }

  if (stack.has(id)) {
    memo.set(memoKey, undefined)
    return undefined
  }

  const entry = logical.get(id)

  const document = mode === 'published' ? entry?.published : projectedDocument(entry)

  const slug = document?.slug?.current?.trim()

  if (!document || !slug) {
    memo.set(memoKey, undefined)
    return undefined
  }

  const nextStack = new Set(stack)
  nextStack.add(id)

  const parentId = cleanId(document.parent?._ref)

  if (!parentId) {
    /*
     * A Taxonomy document's public route is its complete slug chain.
     *
     * Example:
     *   blog
     *     -> conditions
     *        -> diabetes
     *
     * resolves to:
     *   /blog/conditions/diabetes
     *
     * Do not prepend another hard-coded /blog segment here; the `blog`
     * Taxonomy root is already part of the hierarchy.
     */
    const path = `/${slug}`
    memo.set(memoKey, path)
    return path
  }

  /*
   * Published paths use the published parent chain.
   *
   * Projected paths use each parent's latest draft/current state. This is what
   * catches descendant route collisions caused by moving or renaming a parent,
   * even when the descendant itself was not edited.
   */
  const parentPath = resolveTaxonomyPath(parentId, logical, mode, memo, nextStack)

  if (!parentPath) {
    memo.set(memoKey, undefined)
    return undefined
  }

  const path = `${parentPath}/${slug}`
  memo.set(memoKey, path)
  return path
}

function buildRouteStates(logical: Map<string, TaxonomyLogicalDocument>): TaxonomyRouteState[] {
  const memo = new Map<string, string | undefined>()
  const states: TaxonomyRouteState[] = []

  for (const [id, entry] of logical) {
    const projected = projectedDocument(entry)

    states.push({
      id,
      label: documentLabel(projected, id),
      publishedPath: resolveTaxonomyPath(id, logical, 'published', memo),
      projectedPath: resolveTaxonomyPath(id, logical, 'projected', memo),
      publishedCreatedAt: entry.published?._createdAt,
      projectedCreatedAt: projected?._createdAt ?? entry.published?._createdAt,
    })
  }

  return states
}

function selectRouteOwner(route: string, candidates: TaxonomyRouteState[]): TaxonomyRouteState {
  const publishedOwners = candidates
    .filter((candidate) => candidate.publishedPath === route)
    .sort((left, right) => sortRouteOwners(left, right, 'published'))

  if (publishedOwners.length > 0) {
    return publishedOwners[0]
  }

  return [...candidates].sort((left, right) => sortRouteOwners(left, right, 'projected'))[0]
}

function uniqueBlogLocales(blogs: BlogDocument[]): string[] {
  return [
    ...new Set(
      blogs
        .map((blog) => blog.locale?.trim())
        .filter((locale): locale is string => Boolean(locale)),
    ),
  ].sort()
}

/**
 * Taxonomy route integrity.
 *
 * Protects:
 * - duplicate sibling URL Segments
 * - full nested route collisions caused by parent moves/renames
 * - deterministic duplicate ownership (published route wins; otherwise oldest)
 * - root Taxonomy collisions with Blog routes
 */
export async function validateTaxonomyRouteIntegrity(value: unknown, context: ValidationContext) {
  const current = value as TaxonomyDocument | undefined

  const siteId = cleanId(current?.site?._ref)
  const currentId = cleanId(current?._id)
  const slug = current?.slug?.current?.trim()

  if (!current || !siteId || !currentId || !slug) {
    return true
  }

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const taxonomyDocuments = await client.fetch<TaxonomyDocument[]>(
    `
      *[
        _type == "taxonomy" &&
        site._ref == $siteId
      ]{
        _id,
        _createdAt,
        title,
        site,
        parent,
        slug
      }
    `,
    {
      siteId,
    },
  )

  const logical = buildLogicalTaxonomyDocuments(taxonomyDocuments, current)

  const states = buildRouteStates(logical)
  const currentState = states.find((state) => state.id === currentId)
  const currentRoute = currentState?.projectedPath

  /*
   * Parent validation owns missing/circular hierarchy errors. If the path
   * cannot be resolved, do not pile a second route error on top.
   */
  if (!currentRoute) {
    return true
  }

  const routeCandidates = states.filter(
    (state) => state.publishedPath === currentRoute || state.projectedPath === currentRoute,
  )

  const logicalCandidates = [
    ...new Map(routeCandidates.map((candidate) => [candidate.id, candidate])).values(),
  ]

  if (logicalCandidates.length > 1) {
    const owner = selectRouteOwner(currentRoute, logicalCandidates)

    if (owner.id !== currentId) {
      return {
        message:
          `Another Taxonomy Term already owns route "${currentRoute}": ` +
          `${owner.label}. Choose a different URL Segment or Parent.`,
        path: ['slug'],
      }
    }
  }

  /*
   * Blog detail routes occupy exactly:
   *
   *   /blog/<slug>
   *
   * Taxonomy may also resolve to that exact public path through its hierarchy:
   *
   *   blog -> nutrition  => /blog/nutrition
   *
   * Compare the resolved public route rather than inspecting whether the
   * Taxonomy Term itself has a Parent.
   */
  const routeSegments = currentRoute.split('/').filter(Boolean)

  if (routeSegments.length === 2 && routeSegments[0] === 'blog') {
    const blogSlug = routeSegments[1]

    const blogs = await client.fetch<BlogDocument[]>(
      `
        *[
          _type == "blog" &&
          site._ref == $siteId &&
          slug.current == $blogSlug
        ]{
          _id,
          title,
          locale
        }
      `,
      {
        siteId,
        blogSlug,
      },
    )

    if (blogs.length > 0) {
      const locales = uniqueBlogLocales(blogs)

      const localeText =
        locales.length === 0
          ? ''
          : locales.length === 1
            ? ` for locale "${locales[0]}"`
            : ` for locales ${locales.map((locale) => `"${locale}"`).join(', ')}`

      return {
        message:
          `Taxonomy route "${currentRoute}" conflicts with an existing ` +
          `Blog${localeText} on this Site. Choose a different URL Segment ` +
          `or Parent.`,
        path: ['slug'],
      }
    }
  }

  return true
}

/**
 * Reverse protection for Blog creation/editing.
 *
 * A Blog cannot claim a slug currently used (published or draft) by a root
 * Taxonomy Term on the same Site.
 */
export async function validateBlogTaxonomyRouteCollision(
  value: unknown,
  context: ValidationContext,
) {
  const document = value as
    | {
        site?: ReferenceValue
        locale?: string
        slug?: SlugValue
      }
    | undefined

  const siteId = cleanId(document?.site?._ref)
  const slug = document?.slug?.current?.trim()

  if (!siteId || !slug) {
    return true
  }

  const targetRoute = `/blog/${slug}`

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const taxonomyDocuments = await client.fetch<TaxonomyDocument[]>(
    `
      *[
        _type == "taxonomy" &&
        site._ref == $siteId
      ]{
        _id,
        _createdAt,
        title,
        site,
        parent,
        slug
      }
    `,
    {
      siteId,
    },
  )

  if (taxonomyDocuments.length === 0) {
    return true
  }

  /*
   * There is no Taxonomy document currently being edited in this validation
   * call, so raw draft/published data is enough to build both live and
   * projected Taxonomy routes.
   */
  const logical = new Map<string, TaxonomyLogicalDocument>()

  for (const taxonomyDocument of taxonomyDocuments) {
    const id = cleanId(taxonomyDocument._id)

    if (!id) {
      continue
    }

    const entry = logical.get(id) ?? {
      id,
    }

    if (isDraftId(taxonomyDocument._id)) {
      entry.draft = taxonomyDocument
    } else {
      entry.published = taxonomyDocument
    }

    logical.set(id, entry)
  }

  const states = buildRouteStates(logical)

  const conflicting = states
    .filter((state) => state.publishedPath === targetRoute || state.projectedPath === targetRoute)
    .sort((left, right) => left.id.localeCompare(right.id))[0]

  if (!conflicting) {
    return true
  }

  return {
    message:
      `Taxonomy route "${targetRoute}" is already owned by ` +
      `${conflicting.label} on this Site. Choose a different Blog slug.`,
    path: ['slug'],
  }
}
