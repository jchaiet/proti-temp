import type {ValidationContext} from 'sanity'

import {cleanId, documentIds, isDraftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type TaxonomyDocument = {
  _id: string
  title?: string
  kind?: 'term' | 'group'
  includeInFilters?: boolean
  includeInBlogTags?: boolean
}

type TaxonomyUsageValidationOptions = {
  requireFilterable?: boolean
  requireBlogTaggable?: boolean
}

export async function validateTaxonomyUsageReferences(
  references: ReferenceValue[] | undefined,
  context: ValidationContext,
  options: TaxonomyUsageValidationOptions = {},
): Promise<true | string> {
  if (!references?.length) {
    return true
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
        kind,
        includeInFilters,
        includeInBlogTags
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

    if (!taxonomyDocument) {
      continue
    }

    const label = taxonomyDocument.title?.trim()
      ? `"${taxonomyDocument.title.trim()}"`
      : referenceId

    if (taxonomyDocument.kind === 'group') {
      return `Taxonomy Group ${label} is organizational only and cannot be assigned as a Taxonomy Term.`
    }

    if (options.requireFilterable && taxonomyDocument.includeInFilters === false) {
      return `Taxonomy Term ${label} is excluded from visitor filters.`
    }

    if (options.requireBlogTaggable && taxonomyDocument.includeInBlogTags === false) {
      return `Taxonomy Term ${label} is excluded from Blog tagging.`
    }
  }

  return true
}
