import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const authorTypePath = fileURLToPath(new URL('../authorType.ts', import.meta.url))

describe('Author legacy bio schema', () => {
  it('does not expose the legacy string bio field', () => {
    const source = readFileSync(authorTypePath, 'utf8')

    expect(source).not.toMatch(/\bname\s*:\s*['"]bio['"]/)
    expect(source).not.toContain('Legacy Bio')
  })

  it('keeps the rich text bio fields', () => {
    const source = readFileSync(authorTypePath, 'utf8')

    const richTextBioMatches = source.match(/\bname\s*:\s*['"]bioRichText['"]/g) ?? []

    expect(richTextBioMatches).toHaveLength(2)
  })
})
