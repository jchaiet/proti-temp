import {describe, expect, it} from 'vitest'

import {validateNavigationKey} from '../navigationKey'
import {createValidationContext} from './testUtils'

describe('Navigation Key validation', () => {
  it('rejects malformed keys before querying Sanity', async () => {
    const {context, getClient} = createValidationContext({
      document: {
        _id: 'header-1',
        _type: 'navigationHeader',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
    })

    await expect(validateNavigationKey('Default Header', context)).resolves.toBe(
      'Key may only contain lowercase letters, numbers, and hyphens.',
    )

    expect(getClient).not.toHaveBeenCalled()
  })

  it.each([
    ['navigationHeader', 'Header Navigation'],
    ['navigationFooter', 'Footer Navigation'],
    ['navigationSet', 'Navigation Set'],
  ])('rejects duplicate %s keys within the same Site and Locale', async (documentType, label) => {
    const {context, fetch, getClient, withConfig} = createValidationContext({
      document: {
        _id: 'drafts.current-document',
        _type: documentType,
        site: {_ref: 'drafts.site-a'},
        locale: 'en-us',
      },
      fetchResults: [1],
    })

    await expect(validateNavigationKey('default', context)).resolves.toBe(
      `Another ${label} with this Key already exists for this Site and Locale.`,
    )

    expect(getClient).toHaveBeenCalledWith({apiVersion: '2026-08-21'})
    expect(withConfig).toHaveBeenCalledWith({perspective: 'raw'})
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('_type == $documentType'), {
      documentType,
      siteId: 'site-a',
      locale: 'en-us',
      key: 'default',
      documentId: 'current-document',
      draftId: 'drafts.current-document',
    })
  })

  it('allows the same Key when no matching document exists', async () => {
    const {context} = createValidationContext({
      document: {
        _id: 'navigation-a',
        _type: 'navigationSet',
        site: {_ref: 'site-a'},
        locale: 'en-us',
      },
      fetchResults: [0],
    })

    await expect(validateNavigationKey('default', context)).resolves.toBe(true)
  })

  it('defers duplicate validation until Site and Locale are available', async () => {
    const {context, getClient} = createValidationContext({
      document: {
        _id: 'header-1',
        _type: 'navigationHeader',
      },
    })

    await expect(validateNavigationKey('default-header', context)).resolves.toBe(true)
    expect(getClient).not.toHaveBeenCalled()
  })
})
