import {describe, expect, it} from 'vitest'

import {validateBlogEditorial} from '../blogEditorial'

describe('validateBlogEditorial', () => {
  it('allows editorial metadata to be omitted', () => {
    expect(validateBlogEditorial({})).toBe(true)
  })

  it('requires the reviewer to differ from the author', () => {
    expect(
      validateBlogEditorial({
        author: {_ref: 'author-1'},
        reviewer: {_ref: 'drafts.author-1'},
        reviewedAt: '2026-09-20T12:00:00Z',
      }),
    ).toEqual({
      message: 'Reviewer must be different from the Blog Author.',
      path: ['reviewer'],
    })
  })

  it('requires a review date when a reviewer is selected', () => {
    expect(
      validateBlogEditorial({
        reviewer: {_ref: 'author-2'},
      }),
    ).toEqual({
      message: 'Add a Review Date when a Reviewer is selected.',
      path: ['reviewedAt'],
    })
  })

  it('requires a reviewer when a review date is provided', () => {
    expect(
      validateBlogEditorial({
        reviewedAt: '2026-09-20T12:00:00Z',
      }),
    ).toEqual({
      message: 'Select a Reviewer when a Review Date is provided.',
      path: ['reviewer'],
    })
  })

  it('rejects an editorial update date earlier than publication', () => {
    expect(
      validateBlogEditorial({
        publishedAt: '2026-09-20T12:00:00Z',
        lastModifiedAt: '2026-09-19T12:00:00Z',
      }),
    ).toEqual({
      message: 'Last Updated Date cannot be earlier than Published Date.',
      path: ['lastModifiedAt'],
    })
  })

  it('accepts a valid reviewer and explicit material update date', () => {
    expect(
      validateBlogEditorial({
        author: {_ref: 'author-1'},
        reviewer: {_ref: 'author-2'},
        reviewedAt: '2026-09-20T12:00:00Z',
        publishedAt: '2026-09-18T12:00:00Z',
        lastModifiedAt: '2026-09-21T12:00:00Z',
      }),
    ).toBe(true)
  })
})
