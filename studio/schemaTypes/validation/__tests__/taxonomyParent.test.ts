import {describe, expect, it, vi} from 'vitest'
import type {ValidationContext} from 'sanity'

import {validateTaxonomyParent} from '../taxonomyParent'

type ReferenceValue = {
  _ref?: string
}

type TaxonomyDocument = {
  _id: string
  site?: ReferenceValue
  parent?: ReferenceValue
}

function createContext({
  documentId = 'taxonomy-current',
  siteId = 'site-1',
  documents = {},
}: {
  documentId?: string
  siteId?: string
  documents?: Record<string, TaxonomyDocument | null>
} = {}) {
  const fetch = vi.fn(async (_query: string, params: Record<string, string>) => {
    const id = params.parentId ?? params.taxonomyId
    return documents[id] ?? null
  })

  const withConfig = vi.fn(() => ({
    fetch,
  }))

  const getClient = vi.fn(() => ({
    withConfig,
  }))

  const context = {
    document: {
      _id: documentId,
      site: siteId
        ? {
            _ref: siteId,
          }
        : undefined,
    },
    getClient,
  } as unknown as ValidationContext

  return {
    context,
    fetch,
    getClient,
    withConfig,
  }
}

describe('validateTaxonomyParent', () => {
  it('allows no Parent', async () => {
    const {context, getClient} = createContext()

    await expect(validateTaxonomyParent(undefined, context)).resolves.toBe(true)
    expect(getClient).not.toHaveBeenCalled()
  })

  it('requires a Site before validating a Parent', async () => {
    const {context, getClient} = createContext({
      siteId: '',
    })

    await expect(validateTaxonomyParent({_ref: 'taxonomy-parent'}, context)).resolves.toBe(
      'Select a Site before choosing a Parent Taxonomy Term.',
    )

    expect(getClient).not.toHaveBeenCalled()
  })

  it('rejects selecting itself as the Parent and normalizes draft IDs', async () => {
    const {context, getClient} = createContext({
      documentId: 'drafts.taxonomy-current',
    })

    await expect(validateTaxonomyParent({_ref: 'drafts.taxonomy-current'}, context)).resolves.toBe(
      'A Taxonomy Term cannot be its own Parent.',
    )

    expect(getClient).not.toHaveBeenCalled()
  })

  it('rejects a missing Parent document', async () => {
    const {context} = createContext()

    await expect(validateTaxonomyParent({_ref: 'taxonomy-parent'}, context)).resolves.toBe(
      'The selected Parent Taxonomy Term could not be found.',
    )
  })

  it('rejects a Parent from another Site', async () => {
    const {context} = createContext({
      documents: {
        'taxonomy-parent': {
          _id: 'taxonomy-parent',
          site: {
            _ref: 'site-2',
          },
        },
      },
    })

    await expect(validateTaxonomyParent({_ref: 'taxonomy-parent'}, context)).resolves.toBe(
      'Parent Taxonomy Term must belong to the same Site.',
    )
  })

  it('accepts a valid same-Site Parent hierarchy', async () => {
    const {context, getClient, withConfig} = createContext({
      documents: {
        'taxonomy-parent': {
          _id: 'taxonomy-parent',
          site: {
            _ref: 'drafts.site-1',
          },
          parent: {
            _ref: 'taxonomy-root',
          },
        },
        'taxonomy-root': {
          _id: 'taxonomy-root',
        },
      },
    })

    await expect(validateTaxonomyParent({_ref: 'drafts.taxonomy-parent'}, context)).resolves.toBe(
      true,
    )

    expect(getClient).toHaveBeenCalledWith({
      apiVersion: '2026-08-21',
    })
    expect(withConfig).toHaveBeenCalledWith({
      perspective: 'drafts',
    })
  })

  it('rejects a Parent that would make the current document its own descendant', async () => {
    const {context} = createContext({
      documents: {
        'taxonomy-parent': {
          _id: 'taxonomy-parent',
          site: {
            _ref: 'site-1',
          },
          parent: {
            _ref: 'taxonomy-current',
          },
        },
      },
    })

    await expect(validateTaxonomyParent({_ref: 'taxonomy-parent'}, context)).resolves.toBe(
      'Taxonomy hierarchy cannot contain a circular Parent reference.',
    )
  })

  it('rejects a circular hierarchy that already exists above the selected Parent', async () => {
    const {context} = createContext({
      documents: {
        'taxonomy-parent': {
          _id: 'taxonomy-parent',
          site: {
            _ref: 'site-1',
          },
          parent: {
            _ref: 'taxonomy-a',
          },
        },
        'taxonomy-a': {
          _id: 'taxonomy-a',
          parent: {
            _ref: 'taxonomy-parent',
          },
        },
      },
    })

    await expect(validateTaxonomyParent({_ref: 'taxonomy-parent'}, context)).resolves.toBe(
      'Taxonomy hierarchy contains a circular Parent reference.',
    )
  })

  it('rejects a hierarchy deeper than the supported limit', async () => {
    const documents: Record<string, TaxonomyDocument> = {
      'taxonomy-parent': {
        _id: 'taxonomy-parent',
        site: {
          _ref: 'site-1',
        },
        parent: {
          _ref: 'taxonomy-1',
        },
      },
    }

    for (let index = 1; index <= 50; index++) {
      documents[`taxonomy-${index}`] = {
        _id: `taxonomy-${index}`,
        parent:
          index < 50
            ? {
                _ref: `taxonomy-${index + 1}`,
              }
            : undefined,
      }
    }

    const {context} = createContext({
      documents,
    })

    await expect(validateTaxonomyParent({_ref: 'taxonomy-parent'}, context)).resolves.toBe(
      'Taxonomy hierarchy is too deep.',
    )
  })
})
