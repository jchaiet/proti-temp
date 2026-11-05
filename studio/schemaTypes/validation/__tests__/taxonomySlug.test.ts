import {describe, expect, it} from 'vitest'

import {validateTaxonomySlug} from '../taxonomySlug'

describe('validateTaxonomySlug', () => {
  it('allows an empty value so the required rule can report it', () => {
    expect(validateTaxonomySlug(undefined)).toBe(true)
    expect(validateTaxonomySlug({})).toBe(true)
  })

  it('accepts lowercase kebab-case URL segments', () => {
    expect(validateTaxonomySlug({current: 'nutrition'})).toBe(true)
    expect(validateTaxonomySlug({current: 'heart-health'})).toBe(true)
    expect(validateTaxonomySlug({current: 'type-2-diabetes'})).toBe(true)
  })

  it('rejects invalid URL segments', () => {
    const message = 'URL Segment may only contain lowercase letters, numbers, and hyphens.'

    expect(validateTaxonomySlug({current: 'Heart Health'})).toBe(message)
    expect(validateTaxonomySlug({current: 'heart_health'})).toBe(message)
    expect(validateTaxonomySlug({current: '-heart-health'})).toBe(message)
    expect(validateTaxonomySlug({current: 'heart-health-'})).toBe(message)
  })
})
