import type {ValidationContext} from 'sanity'

import {cleanId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'
const MAX_TAXONOMY_DEPTH = 50

type ReferenceValue = {
  _ref?: string
}

type TaxonomyDocument = {
  _id: string
  site?: ReferenceValue
  parent?: ReferenceValue
}

export async function validateTaxonomyParent(
  value: unknown,
  context: ValidationContext,
): Promise<true | string> {
  const parent = value as ReferenceValue | undefined

  if (!parent?._ref) {
    return true
  }

  const document = context.document
  const site = document?.site as ReferenceValue | undefined

  if (!site?._ref) {
    return 'Select a Site before choosing a Parent Taxonomy Term.'
  }

  const siteId = cleanId(site._ref)
  const documentId = cleanId(document?._id)
  const parentId = cleanId(parent._ref)

  if (documentId && parentId === documentId) {
    return 'A Taxonomy Term cannot be its own Parent.'
  }

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'drafts',
    })

  const selectedParent = await client.fetch<TaxonomyDocument | null>(
    `
      *[
        _type == "taxonomy" &&
        _id == $parentId
      ][0]{
        _id,
        site,
        parent
      }
    `,
    {
      parentId,
    },
  )

  if (!selectedParent) {
    return 'The selected Parent Taxonomy Term could not be found.'
  }

  if (cleanId(selectedParent.site?._ref) !== siteId) {
    return 'Parent Taxonomy Term must belong to the same Site.'
  }

  /*
   * Prevent circular hierarchies:
   *
   * Conditions
   *   -> Diabetes
   *      -> Conditions  (invalid)
   */
  const visited = new Set<string>()

  let currentId = parentId
  let depth = 0

  while (currentId && depth < MAX_TAXONOMY_DEPTH) {
    if (documentId && currentId === documentId) {
      return 'Taxonomy hierarchy cannot contain a circular Parent reference.'
    }

    if (visited.has(currentId)) {
      return 'Taxonomy hierarchy contains a circular Parent reference.'
    }

    visited.add(currentId)

    const current = await client.fetch<TaxonomyDocument | null>(
      `
        *[
          _type == "taxonomy" &&
          _id == $taxonomyId
        ][0]{
          _id,
          parent
        }
      `,
      {
        taxonomyId: currentId,
      },
    )

    currentId = cleanId(current?.parent?._ref)
    depth++
  }

  if (depth >= MAX_TAXONOMY_DEPTH) {
    return 'Taxonomy hierarchy is too deep.'
  }

  return true
}
