import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type CtaValue = {
  actionType?: string
}

type ParentDocument = {
  site?: ReferenceValue
  locale?: string
}

type ModalDocument = {
  _id: string
  title?: string
  site?: ReferenceValue
  locale?: string
}

function modalLabel(modal: ModalDocument, fallback: string): string {
  const title = modal.title?.trim()

  return title ? `"${title}"` : fallback
}

export async function validateModalReference(
  value: unknown,
  context: ValidationContext,
): Promise<true | string> {
  const cta = context.parent as CtaValue | undefined

  if (cta?.actionType !== 'modal') {
    return true
  }

  const reference = value as ReferenceValue | undefined

  if (!reference?._ref) {
    return 'Select a Modal.'
  }

  const document = context.document as ParentDocument | undefined
  const siteId = cleanId(document?.site?._ref)
  const locale = document?.locale?.trim()

  if (!siteId || !locale) {
    return true
  }

  const modalId = cleanId(reference._ref)

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const modals = await client.fetch<ModalDocument[]>(
    `
      *[
        _type == "modal" &&
        _id in [$modalId, $draftModalId]
      ]{
        _id,
        title,
        site,
        locale
      }
    `,
    {
      modalId,
      draftModalId: draftId(modalId),
    },
  )

  const modal =
    modals.find((candidate) => candidate._id === draftId(modalId)) ??
    modals.find((candidate) => cleanId(candidate._id) === modalId)

  if (!modal) {
    return 'The selected Modal could not be found.'
  }

  if (cleanId(modal.site?._ref) !== siteId) {
    return `Modal ${modalLabel(modal, modalId)} must belong to the same Site as this document.`
  }

  if (modal.locale !== locale) {
    return `Modal ${modalLabel(modal, modalId)} must use the same Locale as this document.`
  }

  return true
}
