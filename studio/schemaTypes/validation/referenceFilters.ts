import {cleanId, draftId} from '../utils/sanityIds'

type ReferenceValue = {
  _ref?: string
}

type SiteDocument = {
  _id?: string
  site?: ReferenceValue
}

type SiteLocaleDocument = SiteDocument & {
  locale?: string
}

type SiteReferenceFilterOptions = {
  excludeCurrentDocument?: boolean
}

export type ReferenceFilterResult =
  | {
      filter: 'false'
    }
  | {
      filter: string
      params:
        | {
            siteId: string
          }
        | {
            siteId: string
            locale: string
          }
        | {
            siteId: string
            documentId: string
            draftId: string
          }
    }

/**
 * Restricts reference pickers used on a Site document to documents owned by
 * that Site.
 *
 * This is useful for fields such as Site.defaultNavigationSets where the
 * current document is the Site itself rather than a document containing a
 * `site` reference.
 */
export function siteOwnedReferenceFilter(
  document: Record<string, unknown> | undefined,
): ReferenceFilterResult {
  const siteId = cleanId(document?._id as string | undefined)

  if (!siteId) {
    return {
      filter: 'false',
    }
  }

  return {
    filter: 'site._ref == $siteId',
    params: {
      siteId,
    },
  }
}

/**
 * Restricts reference pickers to documents that belong to the same Site as
 * the document currently being edited.
 *
 * Use excludeCurrentDocument for hierarchical references, such as a Taxonomy
 * Parent, where the current document must not be selectable.
 */
export function siteReferenceFilter(
  document: Record<string, unknown> | undefined,
  options: SiteReferenceFilterOptions = {},
): ReferenceFilterResult {
  const site = document?.site as SiteDocument['site']

  if (!site?._ref) {
    return {
      filter: 'false',
    }
  }

  const siteId = cleanId(site._ref)

  if (options.excludeCurrentDocument) {
    const documentId = cleanId(document?._id as string | undefined)

    if (documentId) {
      return {
        filter: `
          site._ref == $siteId &&
          !(_id in [$documentId, $draftId])
        `,
        params: {
          siteId,
          documentId,
          draftId: draftId(documentId),
        },
      }
    }
  }

  return {
    filter: `
      site._ref == $siteId
    `,
    params: {
      siteId,
    },
  }
}

/**
 * Restricts Taxonomy reference pickers to assignable Taxonomy Terms for the
 * current Site. Existing Taxonomy documents with no `kind` are treated as
 * normal Terms for backwards compatibility.
 *
 * Taxonomy Groups remain valid hierarchy parents, so this filter should only
 * be used by fields that assign Taxonomy to content or content scopes.
 */
export function taxonomyTermReferenceFilter(
  document: Record<string, unknown> | undefined,
): ReferenceFilterResult {
  const site = document?.site as SiteDocument['site']

  if (!site?._ref) {
    return {
      filter: 'false',
    }
  }

  return {
    filter: `
      site._ref == $siteId &&
      coalesce(kind, "term") != "group"
    `,
    params: {
      siteId: cleanId(site._ref),
    },
  }
}

/**
 * Restricts Blog Taxonomy pickers to assignable Taxonomy Terms that are
 * explicitly available for Blog tagging. Existing Terms with the field unset
 * remain available for backwards compatibility.
 */
export function taxonomyBlogTagReferenceFilter(
  document: Record<string, unknown> | undefined,
): ReferenceFilterResult {
  const site = document?.site as SiteDocument['site']

  if (!site?._ref) {
    return {
      filter: 'false',
    }
  }

  return {
    filter: `
      site._ref == $siteId &&
      coalesce(kind, "term") != "group" &&
      includeInBlogTags != false
    `,
    params: {
      siteId: cleanId(site._ref),
    },
  }
}

/**
 * Restricts Taxonomy reference pickers used for visitor-facing filters.
 *
 * In addition to excluding Groups, Terms explicitly marked
 * `includeInFilters == false` are excluded. Existing Terms with the field
 * unset remain filterable.
 */
export function taxonomyVisitorFilterReferenceFilter(
  document: Record<string, unknown> | undefined,
): ReferenceFilterResult {
  const site = document?.site as SiteDocument['site']

  if (!site?._ref) {
    return {
      filter: 'false',
    }
  }

  return {
    filter: `
      site._ref == $siteId &&
      coalesce(kind, "term") != "group" &&
      includeInFilters != false
    `,
    params: {
      siteId: cleanId(site._ref),
    },
  }
}

/**
 * Restricts reference pickers to documents that belong to the same Site and
 * Locale as the document currently being edited.
 *
 * Returning `filter: 'false'` until both values exist prevents authors from
 * selecting references before the parent document has a complete routing
 * identity.
 */
export function siteLocaleReferenceFilter(
  document: Record<string, unknown> | undefined,
): ReferenceFilterResult {
  const site = document?.site as SiteLocaleDocument['site']
  const locale = document?.locale as SiteLocaleDocument['locale']

  if (!site?._ref || !locale) {
    return {
      filter: 'false',
    }
  }

  return {
    filter: `
      site._ref == $siteId &&
      locale == $locale
    `,
    params: {
      siteId: cleanId(site._ref),
      locale,
    },
  }
}
