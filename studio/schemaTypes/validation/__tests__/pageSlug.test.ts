import {describe, expect, it} from 'vitest'

import {validatePageSlug} from '../pageSlug'
import {createValidationContext} from './testUtils'

describe('Page slug validation', () => {
  it('does not require a URL Segment for the homepage', async () => {
    const {context, fetch} = createValidationContext({
      document: {
        isHomepage: true,
      },
    })

    await expect(validatePageSlug(undefined, context)).resolves.toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requires a URL Segment for non-homepage Pages', async () => {
    const {context} = createValidationContext({
      document: {
        isHomepage: false,
      },
    })

    await expect(validatePageSlug(undefined, context)).resolves.toBe('URL Segment is required.')
  })

  it('rejects malformed URL Segments before querying', async () => {
    const {context, fetch} = createValidationContext({
      document: {
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
    })

    await expect(validatePageSlug('Invalid Slug', context)).resolves.toBe(
      'URL Segment may only contain lowercase letters, numbers, and hyphens.',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('accepts a unique URL Segment beneath the selected Parent', async () => {
    const {context, fetch, withConfig} = createValidationContext({
      document: {
        _id: 'drafts.page-a',
        site: {_ref: 'drafts.site-a'},
        locale: 'en-us',
        parent: {_ref: 'drafts.page-parent'},
      },
      fetchResults: [0],
    })

    await expect(validatePageSlug('nutrition', context)).resolves.toBe(true)

    expect(withConfig).toHaveBeenCalledWith({
      perspective: 'raw',
    })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('parent._ref == $parentId'), {
      siteId: 'site-a',
      locale: 'en-us',
      slug: 'nutrition',
      parentId: 'page-parent',
      documentId: 'page-a',
      draftId: 'drafts.page-a',
    })
  })

  it('uses the root Parent scope when no Parent is selected', async () => {
    const {context, fetch} = createValidationContext({
      document: {
        _id: 'page-a',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [0],
    })

    await expect(validatePageSlug('nutrition', context)).resolves.toBe(true)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('$parentId == null'),
      expect.objectContaining({
        parentId: null,
      }),
    )
  })

  it('rejects a duplicate sibling URL Segment', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'page-b',
        site: {_ref: 'site-a'},
        locale: 'en-us',
        parent: {_ref: 'page-parent'},
      },
      fetchResults: [1],
    })

    await expect(validatePageSlug('nutrition', context)).resolves.toBe(
      'Another Page with this URL Segment already exists beneath the same Parent.',
    )
  })

  it('scopes uniqueness by Site, Locale, and Parent', async () => {
    const {context, fetch} = createValidationContext({
      document: {
        _id: 'page-a',
        site: {_ref: 'site-b'},
        locale: 'es-us',
        parent: {_ref: 'page-other-parent'},
      },
      fetchResults: [0],
    })

    await expect(validatePageSlug('shared-slug', context)).resolves.toBe(true)

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        siteId: 'site-b',
        locale: 'es-us',
        parentId: 'page-other-parent',
      }),
    )
  })
})
