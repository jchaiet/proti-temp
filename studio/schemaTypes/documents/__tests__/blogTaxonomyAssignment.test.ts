import {describe, expect, it} from 'vitest'

import {readFileSync} from 'node:fs'

const blogSource = readFileSync(new URL('../blogType.ts', import.meta.url), 'utf8')
describe('Blog Taxonomy assignment schema', () => {
  it('restricts Blog Taxonomy assignment to Blog-taggable Taxonomy Terms', () => {
    expect(blogSource).toContain('taxonomyBlogTagReferenceFilter')

    expect(blogSource).toContain('filter: ({document}) => taxonomyBlogTagReferenceFilter(document)')
  })
})
