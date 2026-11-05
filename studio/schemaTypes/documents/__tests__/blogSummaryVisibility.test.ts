import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const blogTypePath = fileURLToPath(new URL('../blogType.ts', import.meta.url))

describe('Blog Summary visibility schema', () => {
  const source = readFileSync(blogTypePath, 'utf8')

  it('keeps Summary as the reusable metadata and listing description', () => {
    expect(source).toMatch(/name\s*:\s*['"]summary['"]/)
    expect(source).toContain('default SEO and structured-data description')
  })

  it('defaults article Summary display to off', () => {
    expect(source).toMatch(/name\s*:\s*['"]showSummaryInArticle['"]/)
    expect(source).toContain("title: 'Show Summary in Article'")
    expect(source).toContain('initialValue: false')
  })
})
