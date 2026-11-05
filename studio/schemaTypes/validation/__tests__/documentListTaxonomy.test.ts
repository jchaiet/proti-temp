import {describe, expect, it} from 'vitest'

import {
  validateDocumentListTaxonomyFilterGroups,
  validateDocumentListTaxonomyReferences,
} from '../documentListTaxonomy'
import {createValidationContext} from './testUtils'

describe('Document List taxonomy validation', () => {
  it('accepts Taxonomy Terms belonging to the same Site without requiring a Locale', async () => {
    const {context, fetch, withConfig} = createValidationContext({
      document: {
        site: {_ref: 'drafts.site-1'},
        locale: 'es-us',
      },
      fetchResults: [
        [
          {
            _id: 'taxonomy-a',
            site: {_ref: 'site-1'},
          },
          {
            _id: 'taxonomy-b',
            site: {_ref: 'site-1'},
          },
        ],
      ],
    })

    await expect(
      validateDocumentListTaxonomyReferences(
        [{_ref: 'taxonomy-a'}, {_ref: 'drafts.taxonomy-b'}],
        context,
      ),
    ).resolves.toBe(true)

    expect(withConfig).toHaveBeenCalledWith({
      perspective: 'raw',
    })

    const [query, params] = fetch.mock.calls[0]

    expect(query).toContain('_type == "taxonomy"')
    expect(query).not.toContain('locale')
    expect(params).toEqual({
      ids: ['taxonomy-a', 'drafts.taxonomy-a', 'taxonomy-b', 'drafts.taxonomy-b'],
    })
  })

  it('prefers a draft Taxonomy Term when validating Site ownership', async () => {
    const {context} = createValidationContext({
      document: {
        site: {_ref: 'site-1'},
      },
      fetchResults: [
        [
          {
            _id: 'taxonomy-a',
            site: {_ref: 'site-1'},
          },
          {
            _id: 'drafts.taxonomy-a',
            site: {_ref: 'site-2'},
          },
        ],
      ],
    })

    await expect(
      validateDocumentListTaxonomyReferences([{_ref: 'taxonomy-a'}], context),
    ).resolves.toBe('Taxonomy terms must belong to the same Site as this Document List.')
  })

  it('requires a Site before validating selected Taxonomy Terms', async () => {
    const {context, fetch} = createValidationContext()

    await expect(
      validateDocumentListTaxonomyReferences([{_ref: 'taxonomy-a'}], context),
    ).resolves.toBe('Select a Site before choosing taxonomy terms.')

    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a Taxonomy Group from Dynamic Taxonomy scope', async () => {
    const {context} = createValidationContext({
      document: {
        site: {_ref: 'site-1'},
      },
      fetchResults: [
        [
          {
            _id: 'taxonomy-group',
            title: 'Categories',
            site: {_ref: 'site-1'},
            kind: 'group',
          },
        ],
      ],
    })

    await expect(
      validateDocumentListTaxonomyReferences([{_ref: 'taxonomy-group'}], context),
    ).resolves.toBe(
      'Taxonomy Group "Categories" is organizational only and cannot be used by this Document List.',
    )
  })

  it('rejects a Term excluded from visitor filters when filterability is required', async () => {
    const {context} = createValidationContext({
      document: {
        site: {_ref: 'site-1'},
      },
      fetchResults: [
        [
          {
            _id: 'taxonomy-hidden',
            title: 'Internal Topic',
            site: {_ref: 'site-1'},
            kind: 'term',
            includeInFilters: false,
          },
        ],
      ],
    })

    await expect(
      validateDocumentListTaxonomyReferences([{_ref: 'taxonomy-hidden'}], context, {
        requireFilterable: true,
      }),
    ).resolves.toBe('Taxonomy Term "Internal Topic" is excluded from visitor filters.')
  })
})

it('validates explicit Taxonomy filter-group structure', () => {
  expect(
    validateDocumentListTaxonomyFilterGroups([
      {
        _key: 'type',
        title: 'Type',
        taxonomy: [{_ref: 'taxonomy-article'}, {_ref: 'taxonomy-video'}],
      },
      {
        _key: 'treatment',
        title: 'Treatment',
        taxonomy: [{_ref: 'taxonomy-asthma'}],
      },
    ]),
  ).toBe(true)
})

it('rejects duplicate Taxonomy Terms across visitor filter groups', () => {
  expect(
    validateDocumentListTaxonomyFilterGroups([
      {
        title: 'Type',
        taxonomy: [{_ref: 'taxonomy-shared'}],
      },
      {
        title: 'Treatment',
        taxonomy: [{_ref: 'taxonomy-shared'}],
      },
    ]),
  ).toBe('Taxonomy Term taxonomy-shared is already used in Filter Group "Type".')
})
