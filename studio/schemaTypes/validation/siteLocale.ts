import type {ValidationContext} from 'sanity'

import {cleanId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type SiteReference = {
  _ref?: string
}

export async function validateSiteLocale(
  locale: string | undefined,
  context: ValidationContext,
): Promise<true | string> {
  if (!locale) {
    return true
  }

  const site = context.document?.site as SiteReference | undefined

  if (!site?._ref) {
    return 'Select a Site first.'
  }

  const siteId = cleanId(site._ref)

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'drafts',
    })

  const valid = await client.fetch<boolean>(
    `count(
      *[
        _type == "site" &&
        _id == $siteId &&
        $locale in locales[].code
      ]
    ) > 0`,
    {
      siteId,
      locale,
    },
  )

  return valid ? true : 'Locale must be supported by the selected Site.'
}
