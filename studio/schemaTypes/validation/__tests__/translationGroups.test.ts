import {describe, expect, it} from 'vitest'

import {
  translationDocumentReferenceFilter,
  validateTranslationGroupEntries,
} from '../translationGroups'
import {createValidationContext} from './testUtils'

describe('translationDocumentReferenceFilter', () => {
  it('blocks the picker until Site, Locale, and Content Type are available', () => {
    expect(translationDocumentReferenceFilter({_id: 'group-1'}, {locale: 'en-us'})).toEqual({
      filter: 'false',
    })
  })

  it('filters by Content Type, Site, and Locale', () => {
    const result = translationDocumentReferenceFilter(
      {
        site: {_ref: 'drafts.site-1'},
        contentType: 'page',
      },
      {
        locale: 'es-us',
      },
    )

    expect(result.filter).toContain('_type == $contentType')
    expect(result.filter).toContain('site._ref == $siteId')
    expect(result.filter).toContain('locale == $locale')
    expect(result.params).toEqual({
      contentType: 'page',
      siteId: 'site-1',
      locale: 'es-us',
    })
  })
})

describe('validateTranslationGroupEntries', () => {
  it('accepts matching translations that do not belong to another group', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'drafts.group-1',
        site: {_ref: 'drafts.site-1'},
        contentType: 'page',
      },
      fetchResults: [
        [
          {
            _id: 'page-en',
            _type: 'page',
            site: {_ref: 'site-1'},
            locale: 'en-us',
          },
          {
            _id: 'drafts.page-es',
            _type: 'page',
            site: {_ref: 'site-1'},
            locale: 'es-us',
          },
        ],
        null,
      ],
    })

    await expect(
      validateTranslationGroupEntries(
        [
          {locale: 'en-us', document: {_ref: 'page-en'}},
          {locale: 'es-us', document: {_ref: 'page-es'}},
        ],
        context,
      ),
    ).resolves.toBe(true)
  })

  it('rejects duplicate Locales before querying', async () => {
    const {context, fetch} = createValidationContext({
      document: {
        site: {_ref: 'site-1'},
        contentType: 'page',
      },
    })

    await expect(
      validateTranslationGroupEntries(
        [
          {locale: 'en-us', document: {_ref: 'page-a'}},
          {locale: 'en-us', document: {_ref: 'page-b'}},
        ],
        context,
      ),
    ).resolves.toBe('Each Locale may appear only once in a Translation Group.')

    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects duplicate content references before querying', async () => {
    const {context, fetch} = createValidationContext({
      document: {
        site: {_ref: 'site-1'},
        contentType: 'page',
      },
    })

    await expect(
      validateTranslationGroupEntries(
        [
          {locale: 'en-us', document: {_ref: 'page-a'}},
          {locale: 'es-us', document: {_ref: 'drafts.page-a'}},
        ],
        context,
      ),
    ).resolves.toBe('A content document may appear only once in a Translation Group.')

    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a referenced document from another Site', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'group-1',
        site: {_ref: 'site-1'},
        contentType: 'blog',
      },
      fetchResults: [
        [
          {
            _id: 'blog-1',
            _type: 'blog',
            site: {_ref: 'site-2'},
            locale: 'en-us',
          },
        ],
      ],
    })

    await expect(
      validateTranslationGroupEntries([{locale: 'en-us', document: {_ref: 'blog-1'}}], context),
    ).resolves.toBe('Every Translation must belong to the same Site as the Translation Group.')
  })

  it('rejects documents already assigned to another Translation Group', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'drafts.group-1',
        site: {_ref: 'site-1'},
        contentType: 'page',
      },
      fetchResults: [
        [
          {
            _id: 'page-en',
            _type: 'page',
            site: {_ref: 'site-1'},
            locale: 'en-us',
          },
        ],
        {
          _id: 'group-2',
        },
      ],
    })

    await expect(
      validateTranslationGroupEntries([{locale: 'en-us', document: {_ref: 'page-en'}}], context),
    ).resolves.toBe('One or more selected documents already belong to another Translation Group.')
  })
})
