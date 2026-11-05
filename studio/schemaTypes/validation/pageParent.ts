import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'
const MAX_PARENT_DEPTH = 50

type PageReference = {
  _ref?: string
}

type PageParentDocument = {
  _id?: string
  site?: PageReference
  locale?: string
}

type ParentPageDocument = {
  site?: PageReference
  locale?: string
  parent?: PageReference
}

export type PageParentFilterResult =
  | {
      filter: 'false'
    }
  | {
      filter: string
      params: {
        siteId: string
        locale: string
        documentId: string
        draftId: string
      }
    }

export function pageParentReferenceFilter(
  document: Record<string, unknown> | undefined,
): PageParentFilterResult {
  const page = document as PageParentDocument | undefined
  const siteId = cleanId(page?.site?._ref)
  const locale = page?.locale

  if (!siteId || !locale) {
    return {
      filter: 'false',
    }
  }

  const documentId = cleanId(page?._id)

  return {
    filter: `
      site._ref == $siteId &&
      locale == $locale &&
      isHomepage != true &&
      !(_id in [$documentId, $draftId])
    `,
    params: {
      siteId,
      locale,
      documentId,
      draftId: draftId(documentId),
    },
  }
}

export async function validatePageParent(
  parent: PageReference | undefined,
  context: ValidationContext,
): Promise<true | string> {
  if (!parent?._ref) {
    return true
  }

  const document = context.document as PageParentDocument | undefined

  if (!document) {
    return true
  }

  const currentId = cleanId(document._id)
  const currentSiteId = cleanId(document.site?._ref)
  const currentLocale = document.locale

  let currentParentId = cleanId(parent._ref)

  if (currentId && currentParentId === currentId) {
    return 'A Page cannot be nested beneath itself or one of its descendants.'
  }

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'drafts',
    })

  let depth = 0

  while (currentParentId && depth < MAX_PARENT_DEPTH) {
    if (currentId && currentParentId === currentId) {
      return 'A Page cannot be nested beneath itself or one of its descendants.'
    }

    const parentPage = await client.fetch<ParentPageDocument | null>(
      `*[
          _type == "page" &&
          _id == $parentId
        ][0]{
          site,
          locale,
          parent
        }`,
      {
        parentId: currentParentId,
      },
    )

    if (!parentPage) {
      return 'Parent Page could not be found. Select an existing Parent Page or remove the reference.'
    }

    if (cleanId(parentPage.site?._ref) !== currentSiteId) {
      return 'Parent Page must belong to the same Site.'
    }

    if (parentPage.locale !== currentLocale) {
      return 'Parent Page must use the same Locale.'
    }

    currentParentId = cleanId(parentPage.parent?._ref)
    depth++
  }

  if (depth >= MAX_PARENT_DEPTH) {
    return 'Page hierarchy is too deep or contains a circular reference.'
  }

  return true
}
