import {describe, expect, it} from 'vitest'
import {presentationAllowedOrigins} from './presentationOrigins'

describe('Presentation allowed origins', () => {
  it('allows the configured production preview origin only', () => {
    expect(presentationAllowedOrigins('https://preview.example.com/some/path', true)).toEqual([
      'https://preview.example.com',
    ])
  })

  it('keeps the localhost wildcard for local development', () => {
    expect(presentationAllowedOrigins('http://localhost:3000', false)).toEqual([
      'http://localhost:*',
      'http://localhost:3000',
    ])
  })

  it('does not duplicate wildcard or explicit origins', () => {
    expect(presentationAllowedOrigins('https://preview.example.com', false)).toEqual([
      'http://localhost:*',
      'https://preview.example.com',
    ])
  })
})
