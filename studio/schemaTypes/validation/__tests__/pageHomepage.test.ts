import {describe, expect, it} from 'vitest'

import {validateUniqueHomepage} from '../pageHomepage'
import {createValidationContext} from './testUtils'

describe('homepage validation', () => {
  it('does nothing for a non-homepage Page', async () => {
    const {context, fetch} = createValidationContext()

    await expect(validateUniqueHomepage({_id: 'page-a', isHomepage: false}, context)).resolves.toBe(
      true,
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('accepts the only logical homepage for a Site + Locale', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {_id: 'page-a', _createdAt: '2026-01-01T00:00:00Z', title: 'Home'},
          {_id: 'drafts.page-a', _createdAt: '2026-01-01T00:00:00Z', title: 'Home draft'},
        ],
      ],
    })

    await expect(
      validateUniqueHomepage(
        {
          _id: 'drafts.page-a',
          title: 'Home draft',
          site: {_ref: 'site-a'},
          locale: 'en-US',
          isHomepage: true,
        },
        context,
      ),
    ).resolves.toBe(true)
  })

  it('rejects a second homepage and points at isHomepage', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {_id: 'page-a', _createdAt: '2026-01-01T00:00:00Z', title: 'Existing Home'},
          {_id: 'page-b', _createdAt: '2026-02-01T00:00:00Z', title: 'New Home'},
        ],
      ],
    })

    await expect(
      validateUniqueHomepage(
        {
          _id: 'page-b',
          site: {_ref: 'site-a'},
          locale: 'en-US',
          isHomepage: true,
        },
        context,
      ),
    ).resolves.toEqual({
      message:
        'A homepage already exists for this Site and Locale: "Existing Home". Unmark that Page as Homepage before publishing this one.',
      path: ['isHomepage'],
    })
  })
})
