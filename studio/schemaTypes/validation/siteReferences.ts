import type {ValidationContext} from 'sanity'

import {cleanId, documentIds, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type ReferencingDocument = {
  site?: ReferenceValue
  [key: string]: unknown
}

type ReferencedDocument = {
  _id: string
  title?: string
  name?: string
  site?: ReferenceValue
}

type SameSiteReferenceOptions = {
  fieldName: string
  referenceType: string
  referenceLabel: string
  documentLabel: string
}

function pickDraftFirst(
  candidates: ReferencedDocument[],
  documentId: string,
): ReferencedDocument | undefined {
  const documentDraftId = draftId(documentId)

  return (
    candidates.find((candidate) => candidate._id === documentDraftId) ??
    candidates.find((candidate) => cleanId(candidate._id) === documentId)
  )
}

function referencedLabel(document: ReferencedDocument, fallback: string): string {
  const label = document.name?.trim() || document.title?.trim()

  return label ? `"${label}"` : fallback
}

function validationError(message: string, fieldName: string) {
  return {
    message,
    path: [fieldName],
  }
}

export async function validateSameSiteReference(
  value: unknown,
  context: ValidationContext,
  options: SameSiteReferenceOptions,
) {
  const document = value as ReferencingDocument | undefined
  const reference = document?.[options.fieldName] as ReferenceValue | undefined

  if (!reference?._ref) {
    return true
  }

  const siteId = cleanId(document?.site?._ref)

  if (!siteId) {
    return validationError(
      `Select a Site before choosing a ${options.referenceLabel}.`,
      options.fieldName,
    )
  }

  const referenceId = cleanId(reference._ref)

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const candidates = await client.fetch<ReferencedDocument[]>(
    `
      *[
        _type == $referenceType &&
        _id in [$referenceId, $draftReferenceId]
      ]{
        _id,
        title,
        name,
        site
      }
    `,
    {
      referenceType: options.referenceType,
      referenceId,
      draftReferenceId: draftId(referenceId),
    },
  )

  const referencedDocument = pickDraftFirst(candidates, referenceId)

  if (!referencedDocument) {
    return validationError(
      `The selected ${options.referenceLabel} could not be found.`,
      options.fieldName,
    )
  }

  if (cleanId(referencedDocument.site?._ref) === siteId) {
    return true
  }

  return validationError(
    `${options.referenceLabel} ${referencedLabel(
      referencedDocument,
      referenceId,
    )} must belong to the same Site as this ${options.documentLabel}.`,
    options.fieldName,
  )
}

export async function validateSameSiteReferenceArray(
  value: unknown,
  context: ValidationContext,
  options: SameSiteReferenceOptions,
) {
  const document = value as ReferencingDocument | undefined
  const references = document?.[options.fieldName] as ReferenceValue[] | undefined

  if (!references?.length) {
    return true
  }

  const siteId = cleanId(document?.site?._ref)

  if (!siteId) {
    return validationError(
      `Select a Site before choosing ${options.referenceLabel}.`,
      options.fieldName,
    )
  }

  const referenceIds = references.map((reference) => cleanId(reference?._ref)).filter(Boolean)

  if (referenceIds.length === 0) {
    return true
  }

  const ids = [...new Set(referenceIds.flatMap((id) => documentIds(id)))]

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const candidates = await client.fetch<ReferencedDocument[]>(
    `
      *[
        _type == $referenceType &&
        _id in $ids
      ]{
        _id,
        title,
        name,
        site
      }
    `,
    {
      referenceType: options.referenceType,
      ids,
    },
  )

  for (const referenceId of referenceIds) {
    const referencedDocument = pickDraftFirst(candidates, referenceId)

    if (!referencedDocument) {
      return validationError(
        `A selected ${options.referenceLabel} could not be found.`,
        options.fieldName,
      )
    }

    if (cleanId(referencedDocument.site?._ref) !== siteId) {
      return validationError(
        `${options.referenceLabel} ${referencedLabel(
          referencedDocument,
          referenceId,
        )} must belong to the same Site as this ${options.documentLabel}.`,
        options.fieldName,
      )
    }
  }

  return true
}
