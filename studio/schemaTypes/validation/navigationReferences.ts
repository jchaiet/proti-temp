import type {ValidationContext} from 'sanity'

import {cleanId, draftId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type SiteLocaleDocument = {
  site?: ReferenceValue
  locale?: string
}

type SiteDocument = {
  _id?: string
  locales?: Array<{
    code?: string
  }>
  defaultNavigationSets?: ReferenceValue[]
}

type NavigationOverrideValue = {
  mode?: string
  navigationSet?: ReferenceValue
}

type PageDocument = SiteLocaleDocument & {
  navigation?: NavigationOverrideValue
}

type NavigationSetDocument = SiteLocaleDocument & {
  headerMode?: string
  header?: ReferenceValue
  footerMode?: string
  footer?: ReferenceValue
}

type ReferencedNavigationDocument = {
  _id: string
  title?: string
  site?: ReferenceValue
  locale?: string
}

type ReferenceTarget = {
  type: 'navigationSet' | 'navigationHeader' | 'navigationFooter'
  label: string
  id: string
}

function pickDraftFirst(
  candidates: ReferencedNavigationDocument[],
  id: string,
): ReferencedNavigationDocument | undefined {
  const targetDraftId = draftId(id)

  return (
    candidates.find((candidate) => candidate._id === targetDraftId) ??
    candidates.find((candidate) => cleanId(candidate._id) === id)
  )
}

function targetLabel(document: ReferencedNavigationDocument, fallback: string): string {
  const title = document.title?.trim()

  return title ? `"${title}"` : fallback
}

async function fetchReference(
  context: ValidationContext,
  target: ReferenceTarget,
): Promise<ReferencedNavigationDocument | undefined> {
  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'raw',
    })

  const candidates = await client.fetch<ReferencedNavigationDocument[]>(
    `
      *[
        _type == $type &&
        _id in [$id, $draftId]
      ]{
        _id,
        title,
        site,
        locale
      }
    `,
    {
      type: target.type,
      id: target.id,
      draftId: draftId(target.id),
    },
  )

  return pickDraftFirst(candidates, target.id)
}

function validateSiteAndLocale(
  referenced: ReferencedNavigationDocument,
  currentSiteId: string,
  currentLocale: string,
  target: ReferenceTarget,
  ownerLabel: string,
  path: Array<string>,
) {
  if (cleanId(referenced.site?._ref) !== currentSiteId) {
    return {
      message:
        `${target.label} ${targetLabel(referenced, target.id)} must belong ` +
        `to the same Site as this ${ownerLabel}.`,
      path,
    }
  }

  if (referenced.locale !== currentLocale) {
    return {
      message:
        `${target.label} ${targetLabel(referenced, target.id)} must use ` +
        `the same Locale as this ${ownerLabel}.`,
      path,
    }
  }

  return true
}

/**
 * Site-level ownership for inherited Navigation.
 *
 * The Site stores direct references to its default Navigation Sets. The
 * referenced Navigation Set already owns the Locale, so the Site does not
 * duplicate that value. This validator guarantees that:
 *
 * - every selected Navigation Set belongs to this Site
 * - every selected Navigation Set uses a supported Site Locale
 * - only one default Navigation Set is selected per Locale
 *
 * An empty array remains valid during migration because the web resolver
 * temporarily falls back to Navigation Set `isDefault`.
 */
export async function validateSiteNavigationDefaults(value: unknown, context: ValidationContext) {
  const document = value as SiteDocument | undefined
  const references = (document?.defaultNavigationSets ?? []).filter(
    (reference): reference is ReferenceValue & {_ref: string} => Boolean(reference?._ref),
  )

  if (references.length === 0) {
    return true
  }

  const siteId = cleanId(document?._id)

  if (!siteId) {
    return true
  }

  const supportedLocales = new Set(
    (document?.locales ?? [])
      .map((locale) => locale.code?.trim())
      .filter((locale): locale is string => Boolean(locale)),
  )

  const seenIds = new Set<string>()
  const seenLocales = new Map<string, string>()

  for (const reference of references) {
    const id = cleanId(reference._ref)

    if (!id) {
      continue
    }

    if (seenIds.has(id)) {
      return {
        message: 'A Navigation Set can only be selected once as a Site default.',
        path: ['defaultNavigationSets'],
      }
    }

    seenIds.add(id)

    const target: ReferenceTarget = {
      type: 'navigationSet',
      label: 'Navigation Set',
      id,
    }

    const navigationSet = await fetchReference(context, target)

    if (!navigationSet) {
      return {
        message: 'A selected default Navigation Set could not be found.',
        path: ['defaultNavigationSets'],
      }
    }

    if (cleanId(navigationSet.site?._ref) !== siteId) {
      return {
        message:
          `Navigation Set ${targetLabel(navigationSet, id)} must belong ` +
          'to this Site before it can be selected as a default.',
        path: ['defaultNavigationSets'],
      }
    }

    const locale = navigationSet.locale?.trim()

    if (!locale) {
      return {
        message: `Navigation Set ${targetLabel(navigationSet, id)} must have a Locale.`,
        path: ['defaultNavigationSets'],
      }
    }

    if (supportedLocales.size > 0 && !supportedLocales.has(locale)) {
      return {
        message:
          `Navigation Set ${targetLabel(navigationSet, id)} uses Locale "${locale}", ` +
          'which is not supported by this Site.',
        path: ['defaultNavigationSets'],
      }
    }

    const existing = seenLocales.get(locale)

    if (existing) {
      return {
        message:
          `Only one default Navigation Set is allowed for Locale "${locale}". ` +
          `${existing} and ${targetLabel(navigationSet, id)} both use that Locale.`,
        path: ['defaultNavigationSets'],
      }
    }

    seenLocales.set(locale, targetLabel(navigationSet, id))
  }

  return true
}

/**
 * Page-level safety net for Navigation Override.
 *
 * The nested Navigation Set picker is filtered by Site + Locale, but an
 * already-selected set can become stale if the Page's Site or Locale changes.
 */
export async function validatePageNavigationReference(value: unknown, context: ValidationContext) {
  const document = value as PageDocument | undefined
  const navigation = document?.navigation

  if (navigation?.mode !== 'custom' || !navigation.navigationSet?._ref) {
    return true
  }

  const siteId = cleanId(document?.site?._ref)
  const locale = document?.locale?.trim()

  if (!siteId || !locale) {
    return true
  }

  const id = cleanId(navigation.navigationSet._ref)

  const target: ReferenceTarget = {
    type: 'navigationSet',
    label: 'Navigation Set',
    id,
  }

  const navigationSet = await fetchReference(context, target)

  if (!navigationSet) {
    return {
      message: 'The selected Navigation Set could not be found.',
      path: ['navigation', 'navigationSet'],
    }
  }

  return validateSiteAndLocale(navigationSet, siteId, locale, target, 'Page', [
    'navigation',
    'navigationSet',
  ])
}

/**
 * Navigation Set-level safety net for Header/Footer references.
 *
 * Field-level rules still enforce that a Header/Footer is selected when its
 * mode is Custom. This validator focuses on stale existing references after
 * the Navigation Set's Site or Locale changes.
 */
export async function validateNavigationSetReferences(value: unknown, context: ValidationContext) {
  const document = value as NavigationSetDocument | undefined

  const siteId = cleanId(document?.site?._ref)
  const locale = document?.locale?.trim()

  if (!siteId || !locale) {
    return true
  }

  const checks: Array<{
    mode?: string
    reference?: ReferenceValue
    targetType: ReferenceTarget['type']
    targetLabel: string
    path: Array<string>
  }> = [
    {
      mode: document?.headerMode,
      reference: document?.header,
      targetType: 'navigationHeader',
      targetLabel: 'Header Navigation',
      path: ['header'],
    },
    {
      mode: document?.footerMode,
      reference: document?.footer,
      targetType: 'navigationFooter',
      targetLabel: 'Footer Navigation',
      path: ['footer'],
    },
  ]

  for (const check of checks) {
    if (check.mode !== 'custom' || !check.reference?._ref) {
      continue
    }

    const id = cleanId(check.reference._ref)

    const target: ReferenceTarget = {
      type: check.targetType,
      label: check.targetLabel,
      id,
    }

    const referenced = await fetchReference(context, target)

    if (!referenced) {
      return {
        message: `The selected ${check.targetLabel} could not be found.`,
        path: check.path,
      }
    }

    const result = validateSiteAndLocale(
      referenced,
      siteId,
      locale,
      target,
      'Navigation Set',
      check.path,
    )

    if (result !== true) {
      return result
    }
  }

  return true
}
