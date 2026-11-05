import {describe, expect, it} from 'vitest'

import {
  hasLinkDestination,
  validateNavigationItemDestination,
  validateRequiredLink,
} from '../linkDestination'

describe('link destination validation', () => {
  it('does not treat No Link as a destination', () => {
    expect(hasLinkDestination({type: 'none'})).toBe(false)
  })

  it('treats authored link types as destinations', () => {
    expect(hasLinkDestination({type: 'internal'})).toBe(true)
    expect(hasLinkDestination({type: 'external'})).toBe(true)
    expect(hasLinkDestination({type: 'email'})).toBe(true)
    expect(hasLinkDestination({type: 'phone'})).toBe(true)
    expect(hasLinkDestination({type: 'anchor'})).toBe(true)
  })

  it('rejects No Link where a destination is required', () => {
    expect(validateRequiredLink({type: 'none'})).toBe('Link must have a destination.')
  })

  it('supports consumer-specific validation messages', () => {
    expect(validateRequiredLink({type: 'none'}, 'CTA must have a destination.')).toBe(
      'CTA must have a destination.',
    )
  })

  it('allows a top-level Navigation Item to be dropdown-only', () => {
    expect(
      validateNavigationItemDestination({
        link: {type: 'none'},
        children: [{_key: 'child-a'}],
      }),
    ).toBe(true)
  })

  it('requires a real Link when a top-level Navigation Item has no children', () => {
    expect(
      validateNavigationItemDestination({
        link: {type: 'none'},
        children: [],
      }),
    ).toBe('Add a Link or at least one Dropdown Item.')
  })

  it('accepts a normal top-level Navigation Item with a real Link', () => {
    expect(
      validateNavigationItemDestination({
        link: {type: 'internal'},
        children: [],
      }),
    ).toBe(true)
  })
})
