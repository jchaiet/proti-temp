import {describe, expect, it} from 'vitest'

import {
  buildTaxonomyPath,
  buildTaxonomyPreviewPath,
  createTaxonomyPreviewAncestorSelect,
} from '../taxonomyPath'

describe('taxonomy path utilities', () => {
  it('builds a full nested path from Taxonomy documents', () => {
    expect(
      buildTaxonomyPath('video', [
        {
          _id: 'blog',
          slug: 'blog',
        },
        {
          _id: 'types',
          parentId: 'blog',
          slug: 'types',
        },
        {
          _id: 'video',
          parentId: 'types',
          slug: 'video',
        },
      ]),
    ).toBe('blog/types/video')
  })

  it('includes Group / Folder ancestors in the path', () => {
    expect(
      buildTaxonomyPath('mental-health', [
        {
          _id: 'categories',
          slug: 'categories',
        },
        {
          _id: 'mental-health',
          parentId: 'categories',
          slug: 'mental-health',
        },
      ]),
    ).toBe('categories/mental-health')
  })

  it('returns undefined for circular paths', () => {
    expect(
      buildTaxonomyPath('a', [
        {
          _id: 'a',
          parentId: 'b',
          slug: 'a',
        },
        {
          _id: 'b',
          parentId: 'a',
          slug: 'b',
        },
      ]),
    ).toBeUndefined()
  })

  it('builds a full preview path from ancestor slug selections', () => {
    expect(
      buildTaxonomyPreviewPath('video', {
        ancestorSlug0: 'types',
        ancestorSlug1: 'blog',
      }),
    ).toBe('blog/types/video')
  })

  it('selects ancestor slugs through the configured Taxonomy depth', () => {
    const select = createTaxonomyPreviewAncestorSelect()

    expect(select.ancestorSlug0).toBe('parent.slug.current')
    expect(select.ancestorSlug1).toBe('parent.parent.slug.current')
    expect(Object.keys(select)).toHaveLength(50)
  })
})
