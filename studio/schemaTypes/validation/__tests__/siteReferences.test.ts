import {describe, expect, it} from 'vitest'

import {validateSameSiteReference, validateSameSiteReferenceArray} from '../siteReferences'
import {createValidationContext} from './testUtils'

const authorOptions = {
  fieldName: 'author',
  referenceType: 'author',
  referenceLabel: 'Author',
  documentLabel: 'Blog',
}

const taxonomyOptions = {
  fieldName: 'taxonomy',
  referenceType: 'taxonomy',
  referenceLabel: 'Taxonomy Term',
  documentLabel: 'Blog',
}

describe('same-site reference validation', () => {
  it('accepts a reference belonging to the same Site', async () => {
    const {context} = createValidationContext({
      fetchResults: [[{_id: 'author-a', name: 'Alex Author', site: {_ref: 'site-a'}}]],
    })

    await expect(
      validateSameSiteReference(
        {site: {_ref: 'site-a'}, author: {_ref: 'author-a'}},
        context,
        authorOptions,
      ),
    ).resolves.toBe(true)
  })

  it('prefers the draft reference when checking Site ownership', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {_id: 'author-a', name: 'Alex Author', site: {_ref: 'site-a'}},
          {_id: 'drafts.author-a', name: 'Alex Author', site: {_ref: 'site-b'}},
        ],
      ],
    })

    await expect(
      validateSameSiteReference(
        {site: {_ref: 'site-a'}, author: {_ref: 'author-a'}},
        context,
        authorOptions,
      ),
    ).resolves.toEqual({
      message: 'Author "Alex Author" must belong to the same Site as this Blog.',
      path: ['author'],
    })
  })

  it('rejects an array containing a Taxonomy Term from another Site', async () => {
    const {context} = createValidationContext({
      fetchResults: [
        [
          {_id: 'tax-a', title: 'Nutrition', site: {_ref: 'site-a'}},
          {_id: 'tax-b', title: 'Fitness', site: {_ref: 'site-b'}},
        ],
      ],
    })

    await expect(
      validateSameSiteReferenceArray(
        {
          site: {_ref: 'site-a'},
          taxonomy: [{_ref: 'tax-a'}, {_ref: 'tax-b'}],
        },
        context,
        taxonomyOptions,
      ),
    ).resolves.toEqual({
      message: 'Taxonomy Term "Fitness" must belong to the same Site as this Blog.',
      path: ['taxonomy'],
    })
  })
})
