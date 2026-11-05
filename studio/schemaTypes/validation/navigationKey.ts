import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'
const NAVIGATION_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const NAVIGATION_LABELS: Record<string, string> = {
  navigationHeader: 'Header Navigation',
  navigationFooter: 'Footer Navigation',
  navigationSet: 'Navigation Set',
}

type ReferenceValue = {
  _ref?: string
}

type NavigationKeyContext = {
  document?: {
    _id?: string
    _type?: string
    site?: unknown
    locale?: unknown
  }
  getClient: ValidationContext['getClient']
}

async function hasDuplicateNavigationKey(
  key: string,
  context: NavigationKeyContext,
): Promise<boolean> {
  const document = context.document
  const documentType = document?._type
  const site = document?.site as ReferenceValue | undefined
  const locale = document?.locale as string | undefined

  if (!documentType || !NAVIGATION_LABELS[documentType] || !site?._ref || !locale) {
    return false
  }

  const siteId = cleanId(site._ref)
  const documentId = cleanId(document?._id)
  const documentDraftId = draftId(documentId)

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const duplicateCount = await client.fetch<number>(
    `count(
      *[
        _type == $documentType &&
        site._ref == $siteId &&
        locale == $locale &&
        key == $key &&
        !(_id in [$documentId, $draftId])
      ]
    )`,
    {
      documentType,
      siteId,
      locale,
      key,
      documentId,
      draftId: documentDraftId,
    },
  )

  return duplicateCount > 0
}

export async function validateNavigationKey(
  key: string | undefined,
  context: NavigationKeyContext,
): Promise<true | string> {
  if (!key) {
    return true
  }

  if (!NAVIGATION_KEY_PATTERN.test(key)) {
    return 'Key may only contain lowercase letters, numbers, and hyphens.'
  }

  const documentType = context.document?._type
  const label = documentType ? NAVIGATION_LABELS[documentType] : undefined

  if (!label) {
    return true
  }

  return (await hasDuplicateNavigationKey(key, context))
    ? `Another ${label} with this Key already exists for this Site and Locale.`
    : true
}
