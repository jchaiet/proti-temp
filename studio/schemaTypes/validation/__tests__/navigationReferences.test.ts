import {describe, expect, it} from 'vitest'

import {validateSiteNavigationDefaults} from '../navigationReferences'
import {createValidationContext} from './testUtils'

describe('Site default Navigation validation', () => {
  it('accepts one same-Site Navigation Set per supported Locale', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'navigation-en',
            title: 'Default EN',
            site: {_ref: 'site-a'},
            locale: 'en-us',
          },
        ],
        [
          {
            _id: 'navigation-es',
            title: 'Default ES',
            site: {_ref: 'site-a'},
            locale: 'es-us',
          },
        ],
      ],
    })

    await expect(
      validateSiteNavigationDefaults(
        {
          _id: 'site-a',
          locales: [{code: 'en-us'}, {code: 'es-us'}],
          defaultNavigationSets: [{_ref: 'navigation-en'}, {_ref: 'navigation-es'}],
        },
        context,
      ),
    ).resolves.toBe(true)
  })

  it('accepts an empty configuration during the legacy migration fallback', async () => {
    const {context, fetch} = createValidationContext()

    await expect(
      validateSiteNavigationDefaults(
        {
          _id: 'site-a',
          locales: [{code: 'en-us'}],
          defaultNavigationSets: [],
        },
        context,
      ),
    ).resolves.toBe(true)

    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a Navigation Set belonging to another Site', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'navigation-en',
            title: 'Default EN',
            site: {_ref: 'site-b'},
            locale: 'en-us',
          },
        ],
      ],
    })

    await expect(
      validateSiteNavigationDefaults(
        {
          _id: 'site-a',
          locales: [{code: 'en-us'}],
          defaultNavigationSets: [{_ref: 'navigation-en'}],
        },
        context,
      ),
    ).resolves.toEqual({
      message:
        'Navigation Set "Default EN" must belong to this Site before it can be selected as a default.',
      path: ['defaultNavigationSets'],
    })
  })

  it('rejects a Navigation Set whose Locale is not supported by the Site', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'navigation-fr',
            title: 'Default FR',
            site: {_ref: 'site-a'},
            locale: 'fr-fr',
          },
        ],
      ],
    })

    await expect(
      validateSiteNavigationDefaults(
        {
          _id: 'site-a',
          locales: [{code: 'en-us'}],
          defaultNavigationSets: [{_ref: 'navigation-fr'}],
        },
        context,
      ),
    ).resolves.toEqual({
      message:
        'Navigation Set "Default FR" uses Locale "fr-fr", which is not supported by this Site.',
      path: ['defaultNavigationSets'],
    })
  })

  it('rejects two default Navigation Sets for the same Locale', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {
            _id: 'navigation-a',
            title: 'Primary',
            site: {_ref: 'site-a'},
            locale: 'en-us',
          },
        ],
        [
          {
            _id: 'navigation-b',
            title: 'Alternate',
            site: {_ref: 'site-a'},
            locale: 'en-us',
          },
        ],
      ],
    })

    await expect(
      validateSiteNavigationDefaults(
        {
          _id: 'site-a',
          locales: [{code: 'en-us'}],
          defaultNavigationSets: [{_ref: 'navigation-a'}, {_ref: 'navigation-b'}],
        },
        context,
      ),
    ).resolves.toEqual({
      message:
        'Only one default Navigation Set is allowed for Locale "en-us". "Primary" and "Alternate" both use that Locale.',
      path: ['defaultNavigationSets'],
    })
  })
})
