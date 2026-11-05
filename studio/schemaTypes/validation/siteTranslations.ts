import type {ValidationContext} from 'sanity'

import {cleanId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type SiteReference = {
  _ref?: string
}

type TranslationEntry = {
  _key?: string
  locale?: string
}

type LocalizedDocument = {
  site?: SiteReference
  translations?: TranslationEntry[]
}

type SiteLocalization = {
  defaultLocale?: string

  locales?: Array<{
    code?: string
  }>
}

export type SiteTranslationValidationOptions = {
  documentLabel: string
  baseFieldsLabel?: string
}

function normalizeLocale(locale?: string): string {
  return locale?.trim() ?? ''
}

function validationError(message: string) {
  return {
    message,
    path: ['translations'],
  }
}

/**
 * Shared validation for Site-level documents whose default-locale fields live
 * on the document itself and whose non-default locale values live in an
 * embedded `translations[]` array.
 *
 * Intended for shared Author and Taxonomy documents.
 */
export async function validateSiteTranslations(
  value: unknown,
  context: ValidationContext,
  options: SiteTranslationValidationOptions,
) {
  const document = value as LocalizedDocument | undefined
  const translations = Array.isArray(document?.translations) ? document.translations : []

  /*
   * Translations are optional. A shared document with only its Site default
   * locale content is completely valid.
   */
  if (translations.length === 0) {
    return true
  }

  const siteId = cleanId(document?.site?._ref)

  if (!siteId) {
    return validationError(`Select a Site before adding ${options.documentLabel} translations.`)
  }

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'drafts',
    })

  const siteLocalization = await client.fetch<SiteLocalization | null>(
    `
      *[
        _type == "site" &&
        _id == $siteId
      ][0]{
        defaultLocale,

        locales[]{
          code
        }
      }
    `,
    {
      siteId,
    },
  )

  if (!siteLocalization) {
    return validationError('The selected Site could not be found.')
  }

  const supportedLocales = new Set(
    (siteLocalization.locales ?? []).map((locale) => normalizeLocale(locale.code)).filter(Boolean),
  )

  const defaultLocale = normalizeLocale(siteLocalization.defaultLocale)

  /*
   * Missing locale data should normally be impossible through the custom
   * translation manager, but this catches legacy/corrupt/manual mutations.
   */
  const missingLocaleIndex = translations.findIndex(
    (translation) => !normalizeLocale(translation.locale),
  )

  if (missingLocaleIndex >= 0) {
    return validationError(
      `${options.documentLabel} translation #${missingLocaleIndex + 1} is missing its Locale.`,
    )
  }

  const localeCounts = new Map<string, number>()

  for (const translation of translations) {
    const locale = normalizeLocale(translation.locale)

    localeCounts.set(locale, (localeCounts.get(locale) ?? 0) + 1)
  }

  const duplicateLocales = [...localeCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([locale]) => locale)
    .sort()

  if (duplicateLocales.length > 0) {
    return validationError(
      `Duplicate ${options.documentLabel} translation Locale${
        duplicateLocales.length === 1 ? '' : 's'
      }: ${duplicateLocales.map((locale) => `"${locale}"`).join(', ')}. ` +
        'Only one translation is allowed per Locale.',
    )
  }

  if (defaultLocale) {
    const defaultLocaleTranslation = translations.find(
      (translation) => normalizeLocale(translation.locale) === defaultLocale,
    )

    if (defaultLocaleTranslation) {
      const baseFieldsLabel = options.baseFieldsLabel ?? `base ${options.documentLabel} fields`

      return validationError(
        `Locale "${defaultLocale}" is the Site default Locale and must not be stored in Translations. ` +
          `Use the ${baseFieldsLabel} instead.`,
      )
    }
  }

  const unsupportedLocales = translations
    .map((translation) => normalizeLocale(translation.locale))
    .filter((locale) => !supportedLocales.has(locale))
    .filter((locale, index, values) => values.indexOf(locale) === index)
    .sort()

  if (unsupportedLocales.length > 0) {
    return validationError(
      `Unsupported ${options.documentLabel} translation Locale${
        unsupportedLocales.length === 1 ? '' : 's'
      } for the selected Site: ${unsupportedLocales.map((locale) => `"${locale}"`).join(', ')}.`,
    )
  }

  return true
}
