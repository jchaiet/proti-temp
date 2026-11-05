import {describe, expect, it, vi} from 'vitest'

import {validateModalReference} from '../modalReference'

function context({
  actionType = 'modal',
  siteId = 'site-a',
  locale = 'en-us',
  results = [],
}: {
  actionType?: string
  siteId?: string
  locale?: string
  results?: Array<Record<string, unknown>>
} = {}) {
  const fetch = vi.fn().mockResolvedValue(results)

  return {
    parent: {actionType},
    document: {
      site: {_type: 'reference', _ref: siteId},
      locale,
    },
    getClient: () => ({
      withConfig: () => ({fetch}),
    }),
  } as any
}

describe('Modal reference validation', () => {
  it('does not require a Modal for normal Link CTAs', async () => {
    await expect(validateModalReference(undefined, context({actionType: 'link'}))).resolves.toBe(
      true,
    )
  })

  it('requires a Modal for modal CTAs', async () => {
    await expect(validateModalReference(undefined, context())).resolves.toBe('Select a Modal.')
  })

  it('accepts a Modal from the same Site and Locale', async () => {
    await expect(
      validateModalReference(
        {_type: 'reference', _ref: 'modal-a'},
        context({
          results: [
            {
              _id: 'modal-a',
              title: 'Signup',
              site: {_ref: 'site-a'},
              locale: 'en-us',
            },
          ],
        }),
      ),
    ).resolves.toBe(true)
  })

  it('rejects a Modal from a different Locale', async () => {
    await expect(
      validateModalReference(
        {_type: 'reference', _ref: 'modal-a'},
        context({
          results: [
            {
              _id: 'modal-a',
              title: 'Signup',
              site: {_ref: 'site-a'},
              locale: 'es-us',
            },
          ],
        }),
      ),
    ).resolves.toContain('same Locale')
  })
})
