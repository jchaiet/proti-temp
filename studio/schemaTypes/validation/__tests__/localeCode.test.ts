import {describe, expect, it} from 'vitest'

import {validateLocaleCode} from '../localeCode'

describe('Locale Code validation', () => {
  it('accepts two- and three-letter language codes with a two-letter region', () => {
    expect(validateLocaleCode('en-us')).toBe(true)
    expect(validateLocaleCode('es-us')).toBe(true)
    expect(validateLocaleCode('fil-ph')).toBe(true)
  })

  it('rejects malformed locale shapes', () => {
    expect(validateLocaleCode('en')).not.toBe(true)
    expect(validateLocaleCode('en-usa')).not.toBe(true)
    expect(validateLocaleCode('english-us')).not.toBe(true)
    expect(validateLocaleCode('EN-US')).not.toBe(true)
  })
})
