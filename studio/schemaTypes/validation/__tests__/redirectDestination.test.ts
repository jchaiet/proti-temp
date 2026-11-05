import {describe, expect, it, vi} from 'vitest'

import {
  validateRedirectExternalUrlRequired,
  validateRedirectInternalPage,
  validateRedirectPathDestination,
} from '../redirectDestination'

function createContext({
  document = {},
  parent = {},
  fetchResults = [],
}: {
  document?: Record<string, unknown>
  parent?: Record<string, unknown>
  fetchResults?: unknown[]
} = {}) {
  const fetch = vi.fn()

  for (const result of fetchResults) {
    fetch.mockResolvedValueOnce(result)
  }

  if (fetchResults.length === 0) {
    fetch.mockResolvedValue(null)
  }

  const withConfig = vi.fn().mockReturnValue({fetch})
  const getClient = vi.fn().mockReturnValue({withConfig})

  return {
    context: {
      document,
      parent,
      getClient,
    } as never,
    fetch,
    getClient,
    withConfig,
  }
}

describe('validateRedirectInternalPage', () => {
  it('ignores the field when the destination type is not internal', async () => {
    const {context, getClient} = createContext({parent: {type: 'path'}})

    await expect(validateRedirectInternalPage(undefined, context)).resolves.toBe(true)
    expect(getClient).not.toHaveBeenCalled()
  })

  it('requires an Internal Page for an internal destination', async () => {
    const {context} = createContext({parent: {type: 'internal'}})

    await expect(validateRedirectInternalPage(undefined, context)).resolves.toBe(
      'Select an Internal Page.',
    )
  })

  it('requires Site and Locale before validating the Page', async () => {
    const {context} = createContext({parent: {type: 'internal'}})

    await expect(validateRedirectInternalPage({_ref: 'page-1'}, context)).resolves.toBe(
      'Select a Site and Locale before choosing an Internal Page.',
    )
  })

  it('rejects a missing Page', async () => {
    const {context} = createContext({
      parent: {type: 'internal'},
      document: {
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [null],
    })

    await expect(validateRedirectInternalPage({_ref: 'page-1'}, context)).resolves.toBe(
      'The selected Page could not be found.',
    )
  })

  it('rejects a Page from another Site', async () => {
    const {context} = createContext({
      parent: {type: 'internal'},
      document: {
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [
        {
          site: {_ref: 'site-b'},
          locale: 'en-us',
        },
      ],
    })

    await expect(validateRedirectInternalPage({_ref: 'page-1'}, context)).resolves.toBe(
      'Internal Page must belong to the same Site as this Redirect.',
    )
  })

  it('rejects a Page from another Locale', async () => {
    const {context} = createContext({
      parent: {type: 'internal'},
      document: {
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [
        {
          site: {_ref: 'site-a'},
          locale: 'es-us',
        },
      ],
    })

    await expect(validateRedirectInternalPage({_ref: 'page-1'}, context)).resolves.toBe(
      'Internal Page must use the same Locale as this Redirect.',
    )
  })

  it('accepts a Page from the same Site and Locale and normalizes IDs', async () => {
    const {context, fetch, withConfig} = createContext({
      parent: {type: 'internal'},
      document: {
        site: {_ref: 'drafts.site-a'},
        locale: 'en-us',
      },
      fetchResults: [
        {
          site: {_ref: 'site-a'},
          locale: 'en-us',
        },
      ],
    })

    await expect(validateRedirectInternalPage({_ref: 'drafts.page-1'}, context)).resolves.toBe(true)

    expect(withConfig).toHaveBeenCalledWith({perspective: 'drafts'})
    expect(fetch.mock.calls[0][1]).toEqual({
      pageId: 'page-1',
      draftPageId: 'drafts.page-1',
    })
  })
})

describe('validateRedirectPathDestination', () => {
  it('ignores the field when the destination type is not path', async () => {
    const {context, getClient} = createContext({parent: {type: 'internal'}})

    await expect(validateRedirectPathDestination(undefined, context)).resolves.toBe(true)
    expect(getClient).not.toHaveBeenCalled()
  })

  it('requires a Destination Path for a path destination', async () => {
    const {context} = createContext({parent: {type: 'path'}})

    await expect(validateRedirectPathDestination(undefined, context)).resolves.toBe(
      'Enter a Destination Path.',
    )
  })

  it('validates path format', async () => {
    const {context} = createContext({parent: {type: 'path'}})

    await expect(validateRedirectPathDestination('new-path', context)).resolves.toBe(
      'Destination Path must start with /.',
    )

    await expect(validateRedirectPathDestination('/new?x=1', context)).resolves.toBe(
      'Destination Path must not include a query string or hash.',
    )
  })

  it('rejects a destination that normalizes to its own Source Path', async () => {
    const {context} = createContext({
      parent: {type: 'path'},
      document: {sourcePath: '/old/'},
    })

    await expect(validateRedirectPathDestination('/old', context)).resolves.toBe(
      'A Redirect cannot point to its own Source Path.',
    )
  })

  it('stops successfully when the destination does not continue through another path Redirect', async () => {
    const {context, fetch} = createContext({
      parent: {type: 'path'},
      document: {
        _id: 'drafts.redirect-1',
        sourcePath: '/old',
        site: {_ref: 'drafts.site-a'},
        locale: 'en-us',
      },
      fetchResults: [null],
    })

    await expect(validateRedirectPathDestination('/new', context)).resolves.toBe(true)
    expect(fetch.mock.calls[0][1]).toEqual({
      siteId: 'site-a',
      locale: 'en-us',
      sourcePath: '/new',
      documentId: 'redirect-1',
      draftId: 'drafts.redirect-1',
    })
  })

  it('detects a redirect loop through path destinations', async () => {
    const {context} = createContext({
      parent: {type: 'path'},
      document: {
        _id: 'redirect-1',
        sourcePath: '/a',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [
        {
          _id: 'redirect-2',
          destination: {
            type: 'path',
            path: '/a',
          },
        },
      ],
    })

    await expect(validateRedirectPathDestination('/b', context)).resolves.toBe(
      'This Destination creates a redirect loop.',
    )
  })

  it('stops loop traversal when the next Redirect is not another path destination', async () => {
    const {context} = createContext({
      parent: {type: 'path'},
      document: {
        _id: 'redirect-1',
        sourcePath: '/a',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [
        {
          _id: 'redirect-2',
          destination: {
            type: 'internal',
          },
        },
      ],
    })

    await expect(validateRedirectPathDestination('/b', context)).resolves.toBe(true)
  })
})

describe('validateRedirectExternalUrlRequired', () => {
  it('only requires a value for external destinations', () => {
    const pathContext = createContext({parent: {type: 'path'}}).context
    const externalContext = createContext({parent: {type: 'external'}}).context

    expect(validateRedirectExternalUrlRequired(undefined, pathContext)).toBe(true)
    expect(validateRedirectExternalUrlRequired(undefined, externalContext)).toBe(
      'Enter an External URL.',
    )
    expect(validateRedirectExternalUrlRequired('https://example.com', externalContext)).toBe(true)
  })
})
