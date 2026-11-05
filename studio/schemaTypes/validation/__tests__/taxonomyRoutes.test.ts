import {describe, expect, it} from 'vitest'

import {validateBlogTaxonomyRouteCollision, validateTaxonomyRouteIntegrity} from '../taxonomyRoutes'
import {createValidationContext} from './testUtils'

describe('taxonomy route validation', () => {
  it('accepts a unique nested Taxonomy route', async () => {
    const current = {
      _id: 'tax-child',
      _createdAt: '2026-02-01T00:00:00Z',
      title: 'Nutrition',
      site: {_ref: 'site-a'},
      parent: {_ref: 'tax-blog'},
      slug: {current: 'nutrition'},
    }

    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'tax-blog',
            _createdAt: '2026-01-01T00:00:00Z',
            title: 'Blog',
            site: {_ref: 'site-a'},
            slug: {current: 'blog'},
          },
          current,
        ],
        [],
      ],
    })

    await expect(validateTaxonomyRouteIntegrity(current, context)).resolves.toBe(true)
  })

  it('rejects duplicate projected Taxonomy routes', async () => {
    const current = {
      _id: 'tax-b',
      _createdAt: '2026-02-01T00:00:00Z',
      title: 'Second Nutrition',
      site: {_ref: 'site-a'},
      parent: {_ref: 'tax-blog'},
      slug: {current: 'nutrition'},
    }

    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'tax-blog',
            _createdAt: '2026-01-01T00:00:00Z',
            title: 'Blog',
            site: {_ref: 'site-a'},
            slug: {current: 'blog'},
          },
          {
            _id: 'tax-a',
            _createdAt: '2026-01-10T00:00:00Z',
            title: 'Nutrition',
            site: {_ref: 'site-a'},
            parent: {_ref: 'tax-blog'},
            slug: {current: 'nutrition'},
          },
          current,
        ],
      ],
    })

    await expect(validateTaxonomyRouteIntegrity(current, context)).resolves.toEqual({
      message:
        'Another Taxonomy Term already owns route "/blog/nutrition": "Nutrition". Choose a different URL Segment or Parent.',
      path: ['slug'],
    })
  })

  it('rejects a Taxonomy route that collides with a Blog route', async () => {
    const current = {
      _id: 'tax-child',
      _createdAt: '2026-02-01T00:00:00Z',
      title: 'Nutrition',
      site: {_ref: 'site-a'},
      parent: {_ref: 'tax-blog'},
      slug: {current: 'nutrition'},
    }

    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'tax-blog',
            _createdAt: '2026-01-01T00:00:00Z',
            title: 'Blog',
            site: {_ref: 'site-a'},
            slug: {current: 'blog'},
          },
          current,
        ],
        [{_id: 'blog-a', title: 'Nutrition article', locale: 'en-US'}],
      ],
    })

    await expect(validateTaxonomyRouteIntegrity(current, context)).resolves.toEqual({
      message:
        'Taxonomy route "/blog/nutrition" conflicts with an existing Blog for locale "en-US" on this Site. Choose a different URL Segment or Parent.',
      path: ['slug'],
    })
  })

  it('rejects a Blog slug already occupied by a Taxonomy route', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'tax-blog',
            _createdAt: '2026-01-01T00:00:00Z',
            title: 'Blog',
            site: {_ref: 'site-a'},
            slug: {current: 'blog'},
          },
          {
            _id: 'tax-nutrition',
            _createdAt: '2026-01-02T00:00:00Z',
            title: 'Nutrition',
            site: {_ref: 'site-a'},
            parent: {_ref: 'tax-blog'},
            slug: {current: 'nutrition'},
          },
        ],
      ],
    })

    await expect(
      validateBlogTaxonomyRouteCollision(
        {site: {_ref: 'site-a'}, locale: 'en-US', slug: {current: 'nutrition'}},
        context,
      ),
    ).resolves.toEqual({
      message:
        'Taxonomy route "/blog/nutrition" is already owned by "Nutrition" on this Site. Choose a different Blog slug.',
      path: ['slug'],
    })
  })
})
