import {describe, expect, it} from 'vitest'

import {
  validateCanonicalDomain,
  validateCanonicalUrl,
  validateSiteDomains,
  validateUniqueWebUrls,
  validateWebUrl,
} from '../webUrls'

describe('web URL and SEO URL validation', () => {
  it('accepts valid public http/https URLs', () => {
    expect(validateWebUrl('https://example.com/path?x=1#section')).toBe(true)
    expect(validateWebUrl('http://example.com')).toBe(true)
  })

  it('rejects non-http protocols and embedded credentials', () => {
    expect(validateWebUrl('mailto:test@example.com')).not.toBe(true)
    expect(validateWebUrl('https://user:pass@example.com')).not.toBe(true)
  })

  it('allows canonical query strings but rejects fragments', () => {
    expect(validateCanonicalUrl('https://example.com/article?view=full')).toBe(true)
    expect(validateCanonicalUrl('https://example.com/article#details')).toBe(
      'Canonical URL must not include a #fragment.',
    )
  })

  it('detects normalized duplicate URLs', () => {
    expect(validateUniqueWebUrls(['https://example.com', 'https://EXAMPLE.com/'])).toBe(
      'URLs must be unique.',
    )
  })

  it('accepts unique hostname-only Site domains', () => {
    expect(validateSiteDomains(['example.com', 'www.example.com'])).toBe(true)
  })

  it('requires the canonical domain to be one of the configured Site domains', () => {
    expect(validateCanonicalDomain('example.com', ['www.example.com', 'example.com'])).toBe(true)

    expect(validateCanonicalDomain('EXAMPLE.COM', ['example.com'])).toBe(true)

    expect(
      validateCanonicalDomain('canonical.example.com', ['example.com', 'www.example.com']),
    ).toBe('Canonical Domain must be one of the configured Site Domains.')

    expect(validateCanonicalDomain(undefined, ['example.com'])).toBe(
      'Canonical Domain is required.',
    )
  })

  it('rejects protocols, paths, ports, and case-insensitive duplicate Site domains', () => {
    expect(validateSiteDomains(['https://example.com'])).not.toBe(true)
    expect(validateSiteDomains(['example.com/path'])).not.toBe(true)
    expect(validateSiteDomains(['example.com:443'])).not.toBe(true)
    expect(validateSiteDomains(['example.com', 'EXAMPLE.COM'])).toContain('duplicates')
  })
})
