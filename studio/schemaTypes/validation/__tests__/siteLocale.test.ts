import type {ValidationContext} from 'sanity'
import {describe, expect, it, vi} from 'vitest'

import {validateSiteLocale} from '../siteLocale'

function createContext(options?: {siteRef?: string; fetchResult?: boolean}) {
  const fetch = vi.fn().mockResolvedValue(options?.fetchResult ?? true)
  const withConfig = vi.fn().mockReturnValue({fetch})
  const getClient = vi.fn().mockReturnValue({withConfig})

  const context = {
    document: options?.siteRef
      ? {
          site: {
            _type: 'reference',
            _ref: options.siteRef,
          },
        }
      : {},
    getClient,
  } as unknown as ValidationContext

  return {context, fetch, getClient, withConfig}
}

describe('validateSiteLocale', () => {
  it('allows an empty Locale so required validation can handle it', async () => {
    const {context, getClient} = createContext({siteRef: 'site-1'})

    await expect(validateSiteLocale(undefined, context)).resolves.toBe(true)
    expect(getClient).not.toHaveBeenCalled()
  })

  it('requires a Site before validating a Locale', async () => {
    const {context, getClient} = createContext()

    await expect(validateSiteLocale('en-us', context)).resolves.toBe('Select a Site first.')
    expect(getClient).not.toHaveBeenCalled()
  })

  it('accepts a Locale supported by the selected Site', async () => {
    const {context, fetch, getClient, withConfig} = createContext({
      siteRef: 'drafts.site-1',
      fetchResult: true,
    })

    await expect(validateSiteLocale('en-us', context)).resolves.toBe(true)

    expect(getClient).toHaveBeenCalledWith({apiVersion: '2026-08-21'})
    expect(withConfig).toHaveBeenCalledWith({perspective: 'drafts'})
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('$locale in locales[].code'), {
      siteId: 'site-1',
      locale: 'en-us',
    })
  })

  it('rejects a Locale not supported by the selected Site', async () => {
    const {context} = createContext({
      siteRef: 'site-1',
      fetchResult: false,
    })

    await expect(validateSiteLocale('fr-fr', context)).resolves.toBe(
      'Locale must be supported by the selected Site.',
    )
  })
})
