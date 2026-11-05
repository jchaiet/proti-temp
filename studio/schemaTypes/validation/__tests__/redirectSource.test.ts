import {describe, expect, it, vi} from 'vitest'

import {validateRedirectSourcePath} from '../redirectSource'

function createContext(document: Record<string, unknown> = {}, fetchResult = 0) {
  const fetch = vi
    .fn<(query: string, params?: Record<string, unknown>) => Promise<unknown>>()
    .mockResolvedValue(fetchResult)
  const withConfig = vi.fn().mockReturnValue({fetch})
  const getClient = vi.fn().mockReturnValue({withConfig})

  return {
    context: {
      document,
      getClient,
    } as never,
    fetch,
    getClient,
    withConfig,
  }
}

describe('validateRedirectSourcePath', () => {
  it('allows an empty value so required() can report it', async () => {
    const {context} = createContext()

    await expect(validateRedirectSourcePath(undefined, context)).resolves.toBe(true)
  })

  it('requires a leading slash', async () => {
    const {context} = createContext()

    await expect(validateRedirectSourcePath('old-path', context)).resolves.toBe(
      'Source Path must start with /.',
    )
  })

  it('rejects query strings and hashes', async () => {
    const {context} = createContext()

    await expect(validateRedirectSourcePath('/old?x=1', context)).resolves.toBe(
      'Source Path must not include a query string or hash.',
    )

    await expect(validateRedirectSourcePath('/old#top', context)).resolves.toBe(
      'Source Path must not include a query string or hash.',
    )
  })

  it('rejects spaces, including leading or trailing whitespace', async () => {
    const {context} = createContext()

    await expect(validateRedirectSourcePath('/old path', context)).resolves.toBe(
      'Source Path cannot contain spaces.',
    )

    await expect(validateRedirectSourcePath(' /old/ ', context)).resolves.toBe(
      'Source Path cannot contain spaces.',
    )
  })

  it('defers uniqueness until Site and Locale are available', async () => {
    const {context, getClient} = createContext({site: {_ref: 'site-a'}})

    await expect(validateRedirectSourcePath('/old', context)).resolves.toBe(true)
    expect(getClient).not.toHaveBeenCalled()
  })

  it('checks uniqueness across normalized trailing-slash variants and canonical IDs', async () => {
    const {context, fetch, withConfig} = createContext(
      {
        _id: 'drafts.redirect-1',
        site: {_ref: 'drafts.site-a'},
        locale: 'en-us',
      },
      0,
    )

    await expect(validateRedirectSourcePath('/old/', context)).resolves.toBe(true)

    expect(withConfig).toHaveBeenCalledWith({perspective: 'raw'})
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1]).toEqual({
      siteId: 'site-a',
      locale: 'en-us',
      sourcePaths: ['/old', '/old/'],
      documentId: 'redirect-1',
      draftId: 'drafts.redirect-1',
    })
  })

  it('uses a single canonical variant for the root path', async () => {
    const {context, fetch} = createContext(
      {
        _id: 'redirect-1',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      0,
    )

    await expect(validateRedirectSourcePath('/', context)).resolves.toBe(true)

    expect(fetch.mock.calls[0][1]).toMatchObject({
      sourcePaths: ['/'],
    })
  })

  it('rejects a duplicate source path for the same Site and Locale', async () => {
    const {context} = createContext(
      {
        _id: 'redirect-1',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      1,
    )

    await expect(validateRedirectSourcePath('/old', context)).resolves.toBe(
      'A Redirect with this Source Path already exists for this Site and Locale.',
    )
  })
})
