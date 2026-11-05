import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'
const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type ReferenceValue = {
  _ref?: string
}

type SlugValue = {
  current?: string
}

type BlogSlugContext = {
  document?: {
    _id?: string
    site?: unknown
    locale?: unknown
  }
  getClient: ValidationContext['getClient']
}

async function hasDuplicateBlogSlug(slug: string, context: BlogSlugContext): Promise<boolean> {
  const document = context.document
  const site = document?.site as ReferenceValue | undefined
  const locale = document?.locale as string | undefined

  if (!site?._ref || !locale) {
    return false
  }

  const siteId = cleanId(site._ref)
  const documentId = cleanId(document?._id)
  const documentDraftId = draftId(documentId)

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const duplicateCount = await client.fetch<number>(
    `count(
      *[
        _type == "blog" &&
        site._ref == $siteId &&
        locale == $locale &&
        slug.current == $slug &&
        !(_id in [$documentId, $draftId])
      ]
    )`,
    {
      siteId,
      locale,
      slug,
      documentId,
      draftId: documentDraftId,
    },
  )

  return duplicateCount > 0
}

export async function isBlogSlugUnique(
  slug: string | undefined,
  context: BlogSlugContext,
): Promise<boolean> {
  if (!slug) {
    return true
  }

  return !(await hasDuplicateBlogSlug(slug, context))
}

export async function validateBlogSlug(
  slug: SlugValue | undefined,
  context: BlogSlugContext,
): Promise<true | string> {
  const value = slug?.current

  if (!value) {
    return true
  }

  if (!BLOG_SLUG_PATTERN.test(value)) {
    return 'URL segment may only contain lowercase letters, numbers, and hyphens.'
  }

  return (await hasDuplicateBlogSlug(value, context))
    ? 'Another Blog with this URL segment already exists for this Site and Locale.'
    : true
}
