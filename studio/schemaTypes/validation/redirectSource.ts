import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'
import {getRedirectPathVariants, normalizeRedirectPath} from './redirectPaths'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

export async function validateRedirectSourcePath(
  value: string | undefined,
  context: ValidationContext,
): Promise<true | string> {
  if (!value) return true

  const sourcePath = normalizeRedirectPath(value)

  if (!sourcePath.startsWith('/')) {
    return 'Source Path must start with /.'
  }

  if (sourcePath.includes('?') || sourcePath.includes('#')) {
    return 'Source Path must not include a query string or hash.'
  }

  if (/\s/.test(value)) {
    return 'Source Path cannot contain spaces.'
  }

  const site = context.document?.site as ReferenceValue | undefined
  const locale = context.document?.locale as string | undefined

  if (!site?._ref || !locale) return true

  const siteId = cleanId(site._ref)
  const documentId = cleanId(context.document?._id)
  const currentDraftId = draftId(documentId)
  const sourcePaths = getRedirectPathVariants(sourcePath)

  const client = context.getClient({apiVersion: API_VERSION}).withConfig({perspective: 'raw'})

  const duplicateCount = await client.fetch<number>(
    `count(
      *[
        _type == "redirect" &&
        site._ref == $siteId &&
        locale == $locale &&
        sourcePath in $sourcePaths &&
        !(_id in [$documentId, $draftId])
      ]
    )`,
    {
      siteId,
      locale,
      sourcePaths,
      documentId,
      draftId: currentDraftId,
    },
  )

  return duplicateCount === 0
    ? true
    : 'A Redirect with this Source Path already exists for this Site and Locale.'
}
