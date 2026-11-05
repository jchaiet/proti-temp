import type {ValidationContext} from 'sanity'

import {cleanId, isDraftId, isPublishedId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type PageReference = {
  _ref?: string
}

type HomepageValidationDocument = {
  _id?: string
  title?: string
  site?: PageReference
  locale?: string
  isHomepage?: boolean
}

type HomepageCandidate = {
  _id: string
  _createdAt?: string
  _updatedAt?: string
  title?: string
}

type LogicalHomepageCandidate = {
  id: string
  title?: string
  hasPublished: boolean
  createdAt?: string
}

function compareIsoDate(left?: string, right?: string): number {
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  return left.localeCompare(right)
}

function collapseHomepageCandidates(candidates: HomepageCandidate[]): LogicalHomepageCandidate[] {
  const logical = new Map<string, LogicalHomepageCandidate>()

  for (const candidate of candidates) {
    const id = cleanId(candidate._id)
    if (!id) continue

    const existing = logical.get(id)

    if (!existing) {
      logical.set(id, {
        id,
        title: candidate.title,
        hasPublished: isPublishedId(candidate._id),
        createdAt: candidate._createdAt,
      })
      continue
    }

    existing.hasPublished = existing.hasPublished || isPublishedId(candidate._id)

    if (isDraftId(candidate._id) && candidate.title?.trim()) {
      existing.title = candidate.title
    } else if (!existing.title && candidate.title) {
      existing.title = candidate.title
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

function chooseHomepageOwner(
  candidates: LogicalHomepageCandidate[],
): LogicalHomepageCandidate | undefined {
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

export async function validateUniqueHomepage(value: unknown, context: ValidationContext) {
  const document = value as HomepageValidationDocument | undefined

  if (!document?.isHomepage) {
    return true
  }

  const siteId = cleanId(document.site?._ref)
  const locale = document.locale?.trim()
  const documentId = cleanId(document._id)

  if (!siteId || !locale || !documentId) {
    return true
  }

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const candidates = await client.fetch<HomepageCandidate[]>(
    `
      *[
        _type == "page" &&
        site._ref == $siteId &&
        locale == $locale &&
        isHomepage == true
      ]{
        _id,
        _createdAt,
        title
      }
    `,
    {
      siteId,
      locale,
    },
  )

  const logicalCandidates = collapseHomepageCandidates(candidates)

  if (logicalCandidates.length <= 1) {
    return true
  }

  const owner = chooseHomepageOwner(logicalCandidates)

  if (!owner || owner.id === documentId) {
    return true
  }

  const ownerTitle = owner.title?.trim()
  const ownerLabel = ownerTitle ? `"${ownerTitle}"` : owner.id

  return {
    message:
      `A homepage already exists for this Site and Locale: ${ownerLabel}. ` +
      'Unmark that Page as Homepage before publishing this one.',
    path: ['isHomepage'],
  }
}
