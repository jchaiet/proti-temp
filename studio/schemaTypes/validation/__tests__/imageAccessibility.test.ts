import {describe, expect, it} from 'vitest'

import {validateImageAlt, validateImageAltForImage} from '../imageAccessibility'
import {createValidationContext} from './testUtils'

describe('image accessibility validation', () => {
  it('does not require alt text when no image is selected', () => {
    const {context} = createValidationContext({parent: {}})

    expect(validateImageAlt(undefined, context, 'Featured image')).toBe(true)
  })

  it('requires non-empty alt text when an image is selected', () => {
    const {context} = createValidationContext({
      parent: {asset: {_ref: 'image-abc-1200x800-jpg'}},
    })

    expect(validateImageAlt('   ', context, 'Featured image')).toBe(
      'Featured image Alternative Text is required when an image is selected.',
    )
  })

  it('accepts alt text when an image is selected', () => {
    expect(
      validateImageAltForImage(
        'Person standing beside a lake',
        {asset: {_ref: 'image-abc-1200x800-jpg'}},
        'Card image',
      ),
    ).toBe(true)
  })
})
