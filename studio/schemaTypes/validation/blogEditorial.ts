import {cleanId} from '../utils/sanityIds'

type ReferenceValue = {
  _ref?: string
}

type BlogEditorialDocument = {
  author?: ReferenceValue
  reviewer?: ReferenceValue
  publishedAt?: string
  lastModifiedAt?: string
  reviewedAt?: string
}

function validationError(message: string, fieldName: keyof BlogEditorialDocument) {
  return {
    message,
    path: [fieldName],
  }
}

function parseDate(value?: string): number | null {
  if (!value) return null

  const timestamp = Date.parse(value)

  return Number.isNaN(timestamp) ? null : timestamp
}

export function validateBlogEditorial(value: unknown) {
  const document = value as BlogEditorialDocument | undefined

  if (!document) {
    return true
  }

  const authorId = cleanId(document.author?._ref)
  const reviewerId = cleanId(document.reviewer?._ref)

  if (authorId && reviewerId && authorId === reviewerId) {
    return validationError('Reviewer must be different from the Blog Author.', 'reviewer')
  }

  if (reviewerId && !document.reviewedAt) {
    return validationError('Add a Review Date when a Reviewer is selected.', 'reviewedAt')
  }

  if (document.reviewedAt && !reviewerId) {
    return validationError('Select a Reviewer when a Review Date is provided.', 'reviewer')
  }

  const publishedAt = parseDate(document.publishedAt)
  const lastModifiedAt = parseDate(document.lastModifiedAt)

  if (publishedAt !== null && lastModifiedAt !== null && lastModifiedAt < publishedAt) {
    return validationError(
      'Last Updated Date cannot be earlier than Published Date.',
      'lastModifiedAt',
    )
  }

  return true
}
