import type {ValidationContext} from 'sanity'

import {cleanId, documentIds, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type TranslationEntryValue = {
  locale?: string
  document?: ReferenceValue
}

type TranslationGroupDocument = {
  _id?: string
  site?: ReferenceValue
  contentType?: 'page' | 'blog'
}

type TranslationTarget = {
  _id: string
  _type: string
  locale?: string
  site?: ReferenceValue
}

export function translationDocumentReferenceFilter(
  document: Record<string, unknown> | undefined,
  parent: unknown,
) {
  const group = document as TranslationGroupDocument | undefined
  const entry = parent as TranslationEntryValue | undefined

  const siteId = cleanId(group?.site?._ref)
  const locale = entry?.locale
  const contentType = group?.contentType

  if (!siteId || !locale || !contentType) {
    return {
      filter: 'false',
    }
  }

  return {
    filter: `
      _type == $contentType &&
      site._ref == $siteId &&
      locale == $locale
    `,
    params: {
      contentType,
      siteId,
      locale,
    },
  }
}

export async function validateTranslationGroupEntries(
  value: TranslationEntryValue[] | undefined,
  context: ValidationContext,
): Promise<true | string> {
  if (!value || value.length === 0) {
    return true
  }

  const document = context.document as TranslationGroupDocument | undefined
  const siteId = cleanId(document?.site?._ref)
  const contentType = document?.contentType

  if (!siteId || !contentType) {
    return 'Select a Site and Content Type before adding translations.'
  }

  const locales = value
    .map((entry) => entry.locale)
    .filter((locale): locale is string => Boolean(locale))

  if (locales.length !== new Set(locales).size) {
    return 'Each Locale may appear only once in a Translation Group.'
  }

  const referenceIds = value.map((entry) => cleanId(entry.document?._ref)).filter(Boolean)

  if (referenceIds.length !== new Set(referenceIds).size) {
    return 'A content document may appear only once in a Translation Group.'
  }

  if (referenceIds.length === 0) {
    return true
  }

  const ids = [...new Set(referenceIds.flatMap((id) => documentIds(id)))]

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'drafts',
    })

  const targets = await client.fetch<TranslationTarget[]>(
    `
      *[
        _id in $ids
      ]{
        _id,
        _type,
        site,
        locale
      }
    `,
    {
      ids,
    },
  )

  const targetById = new Map(targets.map((target) => [cleanId(target._id), target]))

  for (const entry of value) {
    const referenceId = cleanId(entry.document?._ref)

    if (!referenceId) {
      continue
    }

    const target = targetById.get(referenceId)

    if (!target) {
      return 'Every Translation must reference an existing document.'
    }

    if (target._type !== contentType) {
      return 'Every Translation must use the Translation Group Content Type.'
    }

    if (cleanId(target.site?._ref) !== siteId) {
      return 'Every Translation must belong to the same Site as the Translation Group.'
    }

    if (target.locale !== entry.locale) {
      return 'Each Translation Locale must match the Locale on its referenced document.'
    }
  }

  const groupId = cleanId(document?._id)
  const draftGroupId = draftId(groupId)

  const duplicateGroup = await client.fetch<{_id: string} | null>(
    `
      *[
        _type == "translationGroup" &&
        !(
          _id in [
            $groupId,
            $draftGroupId
          ]
        ) &&
        count(
          translations[
            document._ref in
            $referenceIds
          ]
        ) > 0
      ][0]{
        _id
      }
    `,
    {
      groupId,
      draftGroupId,
      referenceIds,
    },
  )

  return duplicateGroup
    ? 'One or more selected documents already belong to another Translation Group.'
    : true
}
