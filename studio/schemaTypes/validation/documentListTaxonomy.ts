import type {ValidationContext} from 'sanity'

import {cleanId, documentIds, isDraftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type TaxonomyDocument = {
  _id: string
  title?: string
  site?: ReferenceValue
  kind?: 'term' | 'group'
  includeInFilters?: boolean
}

type DocumentListTaxonomyValidationOptions = {
  requireFilterable?: boolean
}

export type DocumentListTaxonomyFilterGroupValue = {
  _key?: string
  title?: string
  taxonomy?: ReferenceValue[]
}

/**
 * Validates the authored visitor filter-group structure before individual
 * Taxonomy references are resolved. Groups are intentionally explicit rather
 * than inferred from the Taxonomy hierarchy so authors can control public
 * labels and grouping without changing the underlying Taxonomy tree.
 */
export function validateDocumentListTaxonomyFilterGroups(
  groups: DocumentListTaxonomyFilterGroupValue[] | undefined,
): true | string {
  if (!groups?.length) {
    return true
  }

  const titles = new Set<string>()
  const taxonomyToGroup = new Map<string, string>()

  for (const [index, group] of groups.entries()) {
    const title = group.title?.trim()

    if (!title) {
      return `Filter Group ${index + 1} requires a Group Title.`
    }

    const normalizedTitle = title.toLocaleLowerCase()

    if (titles.has(normalizedTitle)) {
      return `Filter Group title "${title}" is used more than once.`
    }

    titles.add(normalizedTitle)

    const references = Array.isArray(group.taxonomy) ? group.taxonomy : []

    if (references.length === 0) {
      return `Filter Group "${title}" requires at least one Taxonomy Term.`
    }

    for (const reference of references) {
      const taxonomyId = cleanId(reference?._ref)

      if (!taxonomyId) {
        continue
      }

      const existingGroup = taxonomyToGroup.get(taxonomyId)

      if (existingGroup) {
        return `Taxonomy Term ${taxonomyId} is already used in Filter Group "${existingGroup}".`
      }

      taxonomyToGroup.set(taxonomyId, title)
    }
  }

  return true
}

export async function validateDocumentListTaxonomyReferences(
  references: ReferenceValue[] | undefined,
  context: ValidationContext,
  options: DocumentListTaxonomyValidationOptions = {},
): Promise<true | string> {
  if (!references?.length) {
    return true
  }

  const siteId = cleanId((context.document?.site as ReferenceValue | undefined)?._ref)

  if (!siteId) {
    return 'Select a Site before choosing taxonomy terms.'
  }

  const referenceIds = references.map((reference) => cleanId(reference?._ref)).filter(Boolean)

  if (referenceIds.length === 0) {
    return true
  }

  const ids = [...new Set(referenceIds.flatMap((id) => documentIds(id)))]

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
        _id in $ids
      ]{
        _id,
        title,
        site,
        kind,
        includeInFilters
      }
    `,
    {
      ids,
    },
  )

  const taxonomyById = new Map<string, TaxonomyDocument>()

  for (const taxonomyDocument of taxonomyDocuments) {
    const id = cleanId(taxonomyDocument._id)

    if (!id) {
      continue
    }

    const current = taxonomyById.get(id)

    if (!current || isDraftId(taxonomyDocument._id)) {
      taxonomyById.set(id, taxonomyDocument)
    }
  }

  for (const referenceId of referenceIds) {
    const taxonomyDocument = taxonomyById.get(referenceId)

    if (!taxonomyDocument || cleanId(taxonomyDocument.site?._ref) !== siteId) {
      return 'Taxonomy terms must belong to the same Site as this Document List.'
    }

    const label = taxonomyDocument.title?.trim()
      ? `"${taxonomyDocument.title.trim()}"`
      : referenceId

    if (taxonomyDocument.kind === 'group') {
      return `Taxonomy Group ${label} is organizational only and cannot be used by this Document List.`
    }

    if (options.requireFilterable && taxonomyDocument.includeInFilters === false) {
      return `Taxonomy Term ${label} is excluded from visitor filters.`
    }
  }

  return true
}
