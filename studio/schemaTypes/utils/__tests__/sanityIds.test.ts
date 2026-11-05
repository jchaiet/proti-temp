import {describe, expect, it} from 'vitest'

import {cleanId, documentIds, draftId, isDraftId, isPublishedId} from '../sanityIds'

describe('Sanity document ID utilities', () => {
  it('normalizes published and draft ids', () => {
    expect(cleanId('document-1')).toBe('document-1')
    expect(cleanId('drafts.document-1')).toBe('document-1')
    expect(cleanId()).toBe('')
  })

  it('builds a draft id from either id form', () => {
    expect(draftId('document-1')).toBe('drafts.document-1')
    expect(draftId('drafts.document-1')).toBe('drafts.document-1')
    expect(draftId()).toBe('')
  })

  it('returns both published and draft ids', () => {
    expect(documentIds('document-1')).toEqual(['document-1', 'drafts.document-1'])
    expect(documentIds('drafts.document-1')).toEqual(['document-1', 'drafts.document-1'])
    expect(documentIds()).toEqual([])
  })

  it('identifies draft and published ids', () => {
    expect(isDraftId('drafts.document-1')).toBe(true)
    expect(isDraftId('document-1')).toBe(false)
    expect(isDraftId()).toBe(false)

    expect(isPublishedId('document-1')).toBe(true)
    expect(isPublishedId('drafts.document-1')).toBe(false)
  })
})
