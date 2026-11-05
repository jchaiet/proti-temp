import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'
const MODAL_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type ReferenceValue = {
  _ref?: string
}

type ModalKeyContext = {
  document?: {
    _id?: string
    site?: unknown
    locale?: unknown
  }
  getClient: ValidationContext['getClient']
}

async function hasDuplicateModalKey(key: string, context: ModalKeyContext): Promise<boolean> {
  const document = context.document
  const site = document?.site as ReferenceValue | undefined
  const locale = document?.locale as string | undefined

  if (!site?._ref || !locale) {
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
        _type == "modal" &&
        site._ref == $siteId &&
        locale == $locale &&
        key == $key &&
        !(_id in [$documentId, $draftId])
      ]
    )`,
    {
      siteId,
      locale,
      key,
      documentId,
      draftId: documentDraftId,
    },
  )

  return duplicateCount > 0
}

export async function validateModalKey(
  key: string | undefined,
  context: ModalKeyContext,
): Promise<true | string> {
  if (!key) {
    return true
  }

  if (!MODAL_KEY_PATTERN.test(key)) {
    return 'Key may only contain lowercase letters, numbers, and hyphens.'
  }

  return (await hasDuplicateModalKey(key, context))
    ? 'Another Modal with this Key already exists for this Site and Locale.'
    : true
}
