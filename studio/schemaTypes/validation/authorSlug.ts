import type {ValidationContext} from 'sanity'

import {cleanId, isDraftId, isPublishedId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type SiteReference = {
  _ref?: string
}

type SlugValue = {
  current?: string
}

type AuthorValidationDocument = {
  _id?: string
  name?: string
  site?: SiteReference
  slug?: SlugValue
}

type AuthorCandidate = {
  _id: string
  _createdAt?: string
  name?: string
}

type LogicalAuthorCandidate = {
  id: string
  name?: string
  hasPublished: boolean
  createdAt?: string
}

function compareIsoDate(left?: string, right?: string): number {
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  return left.localeCompare(right)
}

function collapseAuthorCandidates(candidates: AuthorCandidate[]): LogicalAuthorCandidate[] {
  const logical = new Map<string, LogicalAuthorCandidate>()

  for (const candidate of candidates) {
    const id = cleanId(candidate._id)

    if (!id) {
      continue
    }

    const existing = logical.get(id)

    if (!existing) {
      logical.set(id, {
        id,
        name: candidate.name,
        hasPublished: isPublishedId(candidate._id),
        createdAt: candidate._createdAt,
      })
      continue
    }

    existing.hasPublished = existing.hasPublished || isPublishedId(candidate._id)

    if (isDraftId(candidate._id) && candidate.name?.trim()) {
      existing.name = candidate.name
    } else if (!existing.name && candidate.name) {
      existing.name = candidate.name
    }

    if (
      candidate._createdAt &&
      (!existing.createdAt || compareIsoDate(candidate._createdAt, existing.createdAt) < 0)
    ) {
      existing.createdAt = candidate._createdAt
    }
  }

  return [...logical.values()]
}

function chooseAuthorSlugOwner(
  candidates: LogicalAuthorCandidate[],
): LogicalAuthorCandidate | undefined {
  return [...candidates].sort((left, right) => {
    if (left.hasPublished !== right.hasPublished) {
      return left.hasPublished ? -1 : 1
    }

    const createdAtComparison = compareIsoDate(left.createdAt, right.createdAt)

    if (createdAtComparison !== 0) {
      return createdAtComparison
    }

    return left.id.localeCompare(right.id)
  })[0]
}

export async function validateUniqueAuthorSlug(value: unknown, context: ValidationContext) {
  const document = value as AuthorValidationDocument | undefined

  const siteId = cleanId(document?.site?._ref)
  const slug = document?.slug?.current?.trim()
  const documentId = cleanId(document?._id)

  if (!siteId || !slug || !documentId) {
    return true
  }

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const candidates = await client.fetch<AuthorCandidate[]>(
    `
      *[
        _type == "author" &&
        site._ref == $siteId &&
        slug.current == $slug
      ]{
        _id,
        _createdAt,
        name
      }
    `,
    {
      siteId,
      slug,
    },
  )

  const logicalCandidates = collapseAuthorCandidates(candidates)

  if (logicalCandidates.length <= 1) {
    return true
  }

  const owner = chooseAuthorSlugOwner(logicalCandidates)

  if (!owner || owner.id === documentId) {
    return true
  }

  const ownerName = owner.name?.trim()
  const ownerLabel = ownerName ? `"${ownerName}"` : owner.id

  return {
    message:
      `Another Author already uses this URL segment for the selected Site: ${ownerLabel}. ` +
      'Choose a different URL segment before publishing this Author.',
    path: ['slug'],
  }
}
