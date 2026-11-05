import type {ValidationContext} from 'sanity'
import {describe, expect, it, vi} from 'vitest'

import {isBlogSlugUnique, validateBlogSlug} from '../blogSlug'

type TestContext = {
  document?: {
    _id?: string
    site?: unknown
    locale?: unknown
  }
  getClient: ValidationContext['getClient']
}

function createContext(options?: {document?: TestContext['document']; duplicateCount?: number}) {
  const fetch = vi.fn().mockResolvedValue(options?.duplicateCount ?? 0)
  const withConfig = vi.fn().mockReturnValue({fetch})
  const getClient = vi.fn().mockReturnValue({withConfig})

  const context: TestContext = {
    document: options?.document ?? {},
    getClient: getClient as unknown as ValidationContext['getClient'],
  }

  return {
    context,
    fetch,
    withConfig,
    getClient,
  }
}

describe('Blog slug validation', () => {
  it('accepts an empty slug without querying Sanity', async () => {
    const {context, getClient} = createContext()

    await expect(isBlogSlugUnique(undefined, context)).resolves.toBe(true)
    await expect(validateBlogSlug(undefined, context)).resolves.toBe(true)

    expect(getClient).not.toHaveBeenCalled()
  })

  it('rejects invalid slug characters without querying Sanity', async () => {
    const {context, getClient} = createContext()

    await expect(
      validateBlogSlug(
        {
          current: 'My Blog',
        },
        context,
      ),
    ).resolves.toBe('URL segment may only contain lowercase letters, numbers, and hyphens.')

    expect(getClient).not.toHaveBeenCalled()
  })

  it('does not run uniqueness lookup until Site and Locale exist', async () => {
    const {context, getClient} = createContext({
      document: {
        site: {
          _type: 'reference',
          _ref: 'site-1',
        },
      },
    })

    await expect(isBlogSlugUnique('my-post', context)).resolves.toBe(true)
    await expect(
      validateBlogSlug(
        {
          current: 'my-post',
        },
        context,
      ),
    ).resolves.toBe(true)

    expect(getClient).not.toHaveBeenCalled()
  })

  it('accepts a slug when no matching Blog exists', async () => {
    const {context} = createContext({
      document: {
        _id: 'blog-1',
        site: {
          _type: 'reference',
          _ref: 'site-1',
        },
        locale: 'en-us',
      },
      duplicateCount: 0,
    })

    await expect(isBlogSlugUnique('my-post', context)).resolves.toBe(true)
    await expect(
      validateBlogSlug(
        {
          current: 'my-post',
        },
        context,
      ),
    ).resolves.toBe(true)
  })

  it('rejects a duplicate slug within the same Site and Locale', async () => {
    const {context} = createContext({
      document: {
        _id: 'blog-1',
        site: {
          _type: 'reference',
          _ref: 'site-1',
        },
        locale: 'en-us',
      },
      duplicateCount: 1,
    })

    await expect(isBlogSlugUnique('my-post', context)).resolves.toBe(false)
    await expect(
      validateBlogSlug(
        {
          current: 'my-post',
        },
        context,
      ),
    ).resolves.toBe('Another Blog with this URL segment already exists for this Site and Locale.')
  })

  it('normalizes draft ids and queries with the raw perspective', async () => {
    const {context, fetch, getClient, withConfig} = createContext({
      document: {
        _id: 'drafts.blog-1',
        site: {
          _type: 'reference',
          _ref: 'drafts.site-1',
        },
        locale: 'es-us',
      },
    })

    await isBlogSlugUnique('mi-articulo', context)

    expect(getClient).toHaveBeenCalledWith({
      apiVersion: '2026-08-21',
    })
    expect(withConfig).toHaveBeenCalledWith({
      perspective: 'raw',
    })

    expect(fetch).toHaveBeenCalledTimes(1)

    const [query, params] = fetch.mock.calls[0]

    expect(query).toContain('_type == "blog"')
    expect(query).toContain('site._ref == $siteId')
    expect(query).toContain('locale == $locale')
    expect(query).toContain('slug.current == $slug')
    expect(query).toContain('!(_id in [$documentId, $draftId])')
    expect(params).toEqual({
      siteId: 'site-1',
      locale: 'es-us',
      slug: 'mi-articulo',
      documentId: 'blog-1',
      draftId: 'drafts.blog-1',
    })
  })
})
