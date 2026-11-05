import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'
import {normalizeRedirectPath} from './redirectPaths'

const API_VERSION = '2026-08-21'
const MAX_REDIRECT_CHAIN_DEPTH = 20

type ReferenceValue = {
  _ref?: string
}

type RedirectDocument = {
  _id: string
  destination?: {
    type?: string
    path?: string
  }
}

export async function validateRedirectInternalPage(
  value: unknown,
  context: ValidationContext,
): Promise<true | string> {
  const parent = context.parent as {type?: string} | undefined

  const reference = value as ReferenceValue | undefined

  if (parent?.type !== 'internal') return true

  if (!reference?._ref) {
    return 'Select an Internal Page.'
  }

  const site = context.document?.site as ReferenceValue | undefined
  const locale = context.document?.locale as string | undefined

  if (!site?._ref || !locale) {
    return 'Select a Site and Locale before choosing an Internal Page.'
  }

  const pageId = cleanId(reference._ref)

  const client = context.getClient({apiVersion: API_VERSION}).withConfig({perspective: 'drafts'})

  const page = await client.fetch<{
    site?: ReferenceValue
    locale?: string
  } | null>(
    `*[
      _type == "page" &&
      _id in [$pageId, $draftPageId]
    ][0]{
      site,
      locale
    }`,
    {
      pageId,
      draftPageId: draftId(pageId),
    },
  )

  if (!page) {
    return 'The selected Page could not be found.'
  }

  if (cleanId(page.site?._ref) !== cleanId(site._ref)) {
    return 'Internal Page must belong to the same Site as this Redirect.'
  }

  if (page.locale !== locale) {
    return 'Internal Page must use the same Locale as this Redirect.'
  }

  return true
}

export async function validateRedirectPathDestination(
  value: string | undefined,
  context: ValidationContext,
): Promise<true | string> {
  const parent = context.parent as {type?: string} | undefined

  if (parent?.type !== 'path') return true

  if (!value) {
    return 'Enter a Destination Path.'
  }

  const path = normalizeRedirectPath(value)

  if (!path.startsWith('/')) {
    return 'Destination Path must start with /.'
  }

  if (path.includes('?') || path.includes('#')) {
    return 'Destination Path must not include a query string or hash.'
  }

  if (/^https?:\/\//i.test(path)) {
    return 'Use External URL for absolute http/https destinations.'
  }

  const sourcePath = normalizeRedirectPath(context.document?.sourcePath as string | undefined)

  if (sourcePath && path === sourcePath) {
    return 'A Redirect cannot point to its own Source Path.'
  }

  const site = context.document?.site as ReferenceValue | undefined
  const locale = context.document?.locale as string | undefined

  if (!site?._ref || !locale || !sourcePath) {
    return true
  }

  const client = context.getClient({apiVersion: API_VERSION}).withConfig({perspective: 'drafts'})

  const siteId = cleanId(site._ref)
  const currentDocumentId = cleanId(context.document?._id)
  const currentDraftId = draftId(currentDocumentId)

  const visited = new Set<string>([sourcePath])

  let currentPath = path
  let depth = 0

  while (currentPath && depth < MAX_REDIRECT_CHAIN_DEPTH) {
    if (visited.has(currentPath)) {
      return 'This Destination creates a redirect loop.'
    }

    visited.add(currentPath)

    const nextRedirect = await client.fetch<RedirectDocument | null>(
      `*[
        _type == "redirect" &&
        site._ref == $siteId &&
        locale == $locale &&
        sourcePath == $sourcePath &&
        enabled != false &&
        !(_id in [$documentId, $draftId])
      ][0]{
        _id,
        destination{
          type,
          path
        }
      }`,
      {
        siteId,
        locale,
        sourcePath: currentPath,
        documentId: currentDocumentId,
        draftId: currentDraftId,
      },
    )

    if (!nextRedirect || nextRedirect.destination?.type !== 'path') {
      return true
    }

    currentPath = normalizeRedirectPath(nextRedirect.destination.path)
    depth++
  }

  return depth >= MAX_REDIRECT_CHAIN_DEPTH
    ? 'Redirect chain is too long or may contain a loop.'
    : true
}

export function validateRedirectExternalUrlRequired(
  value: string | undefined,
  context: ValidationContext,
): true | string {
  const parent = context.parent as {type?: string} | undefined

  if (parent?.type !== 'external') return true

  return value ? true : 'Enter an External URL.'
}
