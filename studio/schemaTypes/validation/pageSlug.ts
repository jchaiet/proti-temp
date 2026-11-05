import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'
const PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type PageReference = {
  _ref?: string
}

type PageSlugDocument = {
  _id?: string
  site?: PageReference
  locale?: string
  parent?: PageReference
  isHomepage?: boolean
}

export async function validatePageSlug(
  slug: string | undefined,
  context: ValidationContext,
): Promise<true | string> {
  const document = context.document as PageSlugDocument | undefined

  if (document?.isHomepage === true) {
    return true
  }

  if (!slug) {
    return 'URL Segment is required.'
  }

  if (!PAGE_SLUG_PATTERN.test(slug)) {
    return 'URL Segment may only contain lowercase letters, numbers, and hyphens.'
  }

  const siteId = cleanId(document?.site?._ref)
  const locale = document?.locale

  if (!siteId || !locale) {
    return true
  }

  const parentId = cleanId(document?.parent?._ref) || null
  const documentId = cleanId(document?._id)

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
        _type == "page" &&
        site._ref == $siteId &&
        locale == $locale &&
        slug == $slug &&
        (
          (
            $parentId == null &&
            !defined(parent)
          ) ||
          parent._ref == $parentId
        ) &&
        !(_id in [$documentId, $draftId])
      ]
    )`,
    {
      siteId,
      locale,
      slug,
      parentId,
      documentId,
      draftId: draftId(documentId),
    },
  )

  return duplicateCount === 0
    ? true
    : 'Another Page with this URL Segment already exists beneath the same Parent.'
}
