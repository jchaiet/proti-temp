import {describe, expect, it} from 'vitest'

import {validateTaxonomyUsageReferences} from '../taxonomyUsage'
import {createValidationContext} from './testUtils'

describe('Taxonomy usage validation', () => {
  it('treats existing Taxonomy items with no kind as assignable Terms', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'taxonomy-a',
            title: 'Nutrition',
          },
        ],
      ],
    })

    await expect(validateTaxonomyUsageReferences([{_ref: 'taxonomy-a'}], context)).resolves.toBe(
      true,
    )
  })

  it('rejects Taxonomy Groups from content assignment', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'taxonomy-group',
            title: 'Categories',
            kind: 'group',
          },
        ],
      ],
    })

    await expect(
      validateTaxonomyUsageReferences([{_ref: 'taxonomy-group'}], context),
    ).resolves.toBe(
      'Taxonomy Group "Categories" is organizational only and cannot be assigned as a Taxonomy Term.',
    )
  })

  it('allows a non-filterable Term for normal Taxonomy assignment', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'taxonomy-private',
            title: 'Internal Topic',
            kind: 'term',
            includeInFilters: false,
          },
        ],
      ],
    })

    await expect(
      validateTaxonomyUsageReferences([{_ref: 'taxonomy-private'}], context),
    ).resolves.toBe(true)
  })

  it('allows a Term excluded from visitor filters to remain available for Blog tagging', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'taxonomy-editorial',
            title: 'Editorial Topic',
            kind: 'term',
            includeInFilters: false,
            includeInBlogTags: true,
          },
        ],
      ],
    })

    await expect(
      validateTaxonomyUsageReferences([{_ref: 'taxonomy-editorial'}], context, {
        requireBlogTaggable: true,
      }),
    ).resolves.toBe(true)
  })

  it('treats existing Terms with no Blog-tagging setting as available for Blogs', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'taxonomy-existing',
            title: 'Existing Topic',
            kind: 'term',
          },
        ],
      ],
    })

    await expect(
      validateTaxonomyUsageReferences([{_ref: 'taxonomy-existing'}], context, {
        requireBlogTaggable: true,
      }),
    ).resolves.toBe(true)
  })

  it('rejects a Term disabled for Blog tagging from Blog assignment', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'taxonomy-admin',
            title: 'Admin Only',
            kind: 'term',
            includeInBlogTags: false,
          },
        ],
      ],
    })

    await expect(
      validateTaxonomyUsageReferences([{_ref: 'taxonomy-admin'}], context, {
        requireBlogTaggable: true,
      }),
    ).resolves.toBe('Taxonomy Term "Admin Only" is excluded from Blog tagging.')
  })

  it('rejects a non-filterable Term from visitor filter configuration', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'taxonomy-private',
            title: 'Internal Topic',
            kind: 'term',
            includeInFilters: false,
          },
        ],
      ],
    })

    await expect(
      validateTaxonomyUsageReferences([{_ref: 'taxonomy-private'}], context, {
        requireFilterable: true,
      }),
    ).resolves.toBe('Taxonomy Term "Internal Topic" is excluded from visitor filters.')
  })
})
