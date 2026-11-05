import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type SingletonReferenceBlock = {
  singleton?: ReferenceValue
}

type ParentDocument = {
  site?: ReferenceValue
  locale?: string
}

type SingletonRecord = {
  _id: string
  title?: string
  site?: ReferenceValue
  locale?: string
}

function pickDraftFirst(
  candidates: SingletonRecord[],
  documentId: string,
): SingletonRecord | undefined {
  const documentDraftId = draftId(documentId)

  return (
    candidates.find((candidate) => candidate._id === documentDraftId) ??
    candidates.find((candidate) => cleanId(candidate._id) === documentId)
  )
}

export async function validateSingletonReference(
  value: SingletonReferenceBlock | undefined,
  context: ValidationContext,
): Promise<true | string> {
  const singletonId = cleanId(value?.singleton?._ref)

  if (!singletonId) {
    return true
  }

  const document = context.document as ParentDocument | undefined
  const siteId = cleanId(document?.site?._ref)
  const locale = document?.locale

  if (!siteId) {
    return 'Select a Site before choosing a Singleton.'
  }

  if (!locale) {
    return 'Select a Locale before choosing a Singleton.'
  }

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const candidates = await client.fetch<SingletonRecord[]>(
    `
      *[
        _type == "singleton" &&
        _id in [$singletonId, $draftSingletonId]
      ]{
        _id,
        title,
        site,
        locale
      }
    `,
    {
      singletonId,
      draftSingletonId: draftId(singletonId),
    },
  )

  const singleton = pickDraftFirst(candidates, singletonId)

  if (!singleton) {
    return 'The selected Singleton could not be found.'
  }

  if (cleanId(singleton.site?._ref) !== siteId) {
    return 'The selected Singleton must belong to the same Site as this document.'
  }

  if (singleton.locale !== locale) {
    return 'The selected Singleton must use the same Locale as this document.'
  }

  return true
}
