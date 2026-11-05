import {describe, expect, it} from 'vitest'

import {generateSingletonKey} from './SingletonKeyInput'

describe('generateSingletonKey', () => {
  it('normalizes names into stable lowercase keys', () => {
    expect(generateSingletonKey('Contact Us')).toBe('contact-us')
    expect(generateSingletonKey('  Primary   Modal  ')).toBe('primary-modal')
  })

  it('removes accents and punctuation', () => {
    expect(generateSingletonKey('Café & Résumé')).toBe('cafe-resume')
  })

  it('returns an empty key when no source value exists', () => {
    expect(generateSingletonKey()).toBe('')
    expect(generateSingletonKey('')).toBe('')
  })
})
