import {describe, expect, it} from 'vitest'

import {pageParentReferenceFilter, validatePageParent} from '../pageParent'
import {createValidationContext} from './testUtils'

describe('Page parent validation', () => {
  it('blocks the Parent picker until Site and Locale are selected', () => {
    expect(pageParentReferenceFilter({_id: 'page-a'})).toEqual({
      filter: 'false',
    })
  })

  it('filters Parent choices to the same Site and Locale and excludes the current Page', () => {
    const result = pageParentReferenceFilter({
      _id: 'drafts.page-a',
      site: {_ref: 'drafts.site-a'},
      locale: 'en-us',
    })

    expect(result.filter).toContain('site._ref == $siteId')
    expect(result.filter).toContain('locale == $locale')
    expect(result.filter).toContain('isHomepage != true')
    expect(result.filter).toContain('!(_id in [$documentId, $draftId])')
    expect(result).toMatchObject({
      params: {
        siteId: 'site-a',
        locale: 'en-us',
        documentId: 'page-a',
        draftId: 'drafts.page-a',
      },
    })
  })

  it('accepts a Parent Page from the same Site and Locale', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'page-child',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [
        {
          site: {_ref: 'site-a'},
          locale: 'en-us',
        },
      ],
    })

    await expect(validatePageParent({_ref: 'page-parent'}, context)).resolves.toBe(true)
  })

  it('rejects a broken Parent reference rather than publishing an unreachable Page', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'page-child',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [null],
    })

    await expect(validatePageParent({_ref: 'deleted-page'}, context)).resolves.toBe(
      'Parent Page could not be found. Select an existing Parent Page or remove the reference.',
    )
  })

  it('rejects a Parent Page from another Site', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'page-child',
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

    await expect(validatePageParent({_ref: 'page-parent'}, context)).resolves.toBe(
      'Parent Page must belong to the same Site.',
    )
  })

  it('rejects a Parent Page from another Locale', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'page-child',
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

    await expect(validatePageParent({_ref: 'page-parent'}, context)).resolves.toBe(
      'Parent Page must use the same Locale.',
    )
  })

  it('rejects selecting the current Page as its own Parent', async () => {
    const {context, fetch} = createValidationContext({
      document: {
        _id: 'drafts.page-a',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
    })

    await expect(validatePageParent({_ref: 'page-a'}, context)).resolves.toBe(
      'A Page cannot be nested beneath itself or one of its descendants.',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a Parent whose ancestor chain reaches the current Page', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'page-current',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [
        {
          site: {_ref: 'site-a'},
          locale: 'en-us',
          parent: {_ref: 'page-current'},
        },
      ],
    })

    await expect(validatePageParent({_ref: 'page-child'}, context)).resolves.toBe(
      'A Page cannot be nested beneath itself or one of its descendants.',
    )
  })

  it('protects against excessively deep or circular Parent hierarchies', async () => {
    const fetchResults = Array.from({length: 50}, (_, index) => ({
      site: {_ref: 'site-a'},
      locale: 'en-us',
      parent: {_ref: `page-${index + 1}`},
    }))

    const {context} = createValidationContext({
      document: {
        _id: 'page-current',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults,
    })

    await expect(validatePageParent({_ref: 'page-0'}, context)).resolves.toBe(
      'Page hierarchy is too deep or contains a circular reference.',
    )
  })
})
