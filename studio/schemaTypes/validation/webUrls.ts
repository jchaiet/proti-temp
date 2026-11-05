import type {ValidationContext} from 'sanity'

import {cleanId} from '../utils/sanityIds'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _ref?: string
}

type SiteRouting = {
  defaultLocale?: string
  domains?: string[]
}

function normalizeRoutePath(value?: string): string {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()

  if (trimmed === '/') {
    return '/'
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  return withLeadingSlash.replace(/\/+$/, '')
}

function parseWebUrl(value: string, label: string): URL | string {
  if (value !== value.trim()) {
    return `${label} must not start or end with whitespace.`
  }

  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    return `${label} must be a valid absolute URL.`
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `${label} must use http:// or https://.`
  }

  if (!parsed.hostname) {
    return `${label} must include a hostname.`
  }

  if (parsed.username || parsed.password) {
    return `${label} must not include embedded username or password credentials.`
  }

  return parsed
}

/**
 * Shared validation for public web URLs.
 *
 * Query strings and fragments are intentionally allowed here because they can
 * be legitimate for external links, identity URLs, profiles, and redirects.
 */
export function validateWebUrl(value: string | undefined, label = 'URL'): true | string {
  if (!value) {
    return true
  }

  const result = parseWebUrl(value, label)

  return typeof result === 'string' ? result : true
}

/**
 * Canonical URLs identify the document URL sent to crawlers.
 *
 * Query strings are allowed because parameterized resources can legitimately
 * canonicalize to a query URL. Fragments are rejected because URL fragments
 * are not part of the server resource identity used for canonicalization.
 */
export function validateCanonicalUrl(value: string | undefined): true | string {
  if (!value) {
    return true
  }

  const result = parseWebUrl(value, 'Canonical URL')

  if (typeof result === 'string') {
    return result
  }

  if (result.hash) {
    return 'Canonical URL must not include a #fragment.'
  }

  return true
}

function normalizeComparableUrl(value: string): string | undefined {
  const parsed = parseWebUrl(value, 'URL')

  if (typeof parsed === 'string') {
    return undefined
  }

  /*
   * URL normalizes hostname casing and treats:
   *   https://example.com
   *   https://example.com/
   * as the same destination.
   */
  return parsed.toString()
}

/**
 * Sanity's array `unique()` check is exact-string based.
 * This catches normalized duplicates such as:
 *
 *   https://example.com
 *   https://EXAMPLE.com/
 */
export function validateUniqueWebUrls(values: string[] | undefined): true | string {
  if (!values?.length) {
    return true
  }

  const seen = new Set<string>()

  for (const value of values) {
    if (!value) {
      continue
    }

    const normalized = normalizeComparableUrl(value)

    if (!normalized) {
      continue
    }

    if (seen.has(normalized)) {
      return 'URLs must be unique.'
    }

    seen.add(normalized)
  }

  return true
}

function validateHostnameValue(value: string): true | string {
  const trimmed = value.trim()

  if (!trimmed) {
    return 'Domain cannot be empty.'
  }

  if (value !== trimmed) {
    return `Domain "${value}" must not start or end with whitespace.`
  }

  if (
    trimmed.includes('://') ||
    trimmed.includes('/') ||
    trimmed.includes('?') ||
    trimmed.includes('#')
  ) {
    return `Domain "${value}" must be a hostname only, without protocol, path, query string, or hash.`
  }

  if (trimmed.includes('@')) {
    return `Domain "${value}" must not include credentials.`
  }

  /*
   * Site.domains represents hostnames, not host:port pairs.
   * Keeping ports out also makes host matching deterministic in routing.
   */
  if (trimmed.includes(':')) {
    return `Domain "${value}" must not include a port.`
  }

  let parsed: URL

  try {
    parsed = new URL(`https://${trimmed}`)
  } catch {
    return `Domain "${value}" is not a valid hostname.`
  }

  const hostname = parsed.hostname.replace(/\.$/, '')

  if (!hostname) {
    return `Domain "${value}" is not a valid hostname.`
  }

  const labels = hostname.split('.')

  const invalidLabel = labels.find(
    (label) =>
      !label ||
      label.length > 63 ||
      !/^[a-z0-9-]+$/i.test(label) ||
      label.startsWith('-') ||
      label.endsWith('-'),
  )

  if (invalidLabel) {
    return `Domain "${value}" is not a valid hostname.`
  }

  return true
}

/**
 * Validates Site hostnames and rejects duplicates case-insensitively.
 */
export function validateSiteDomains(values: string[] | undefined): true | string {
  if (!values?.length) {
    return true
  }

  const seen = new Set<string>()

  for (const value of values) {
    const valid = validateHostnameValue(value)

    if (valid !== true) {
      return valid
    }

    const parsed = new URL(`https://${value.trim()}`)
    const normalized = parsed.hostname.replace(/\.$/, '').toLowerCase()

    if (seen.has(normalized)) {
      return `Domain "${value}" duplicates another configured hostname.`
    }

    seen.add(normalized)
  }

  return true
}

/**
 * Validates the Site's canonical hostname.
 *
 * The value must use the same hostname-only format as `domains` and must
 * exactly match one of the configured Site domains (case-insensitively).
 */
export function validateCanonicalDomain(
  value: string | undefined,
  domains: string[] | undefined,
): true | string {
  if (!value) {
    return 'Canonical Domain is required.'
  }

  const valid = validateHostnameValue(value)

  if (valid !== true) {
    return valid.replace(/^Domain /, 'Canonical Domain ')
  }

  const normalizedCanonical = new URL(`https://${value.trim()}`).hostname
    .replace(/\.$/, '')
    .toLowerCase()

  const normalizedDomains = new Set(
    (domains ?? [])
      .map((domain) => {
        const domainValid = validateHostnameValue(domain)

        if (domainValid !== true) {
          return ''
        }

        return new URL(`https://${domain.trim()}`).hostname.replace(/\.$/, '').toLowerCase()
      })
      .filter(Boolean),
  )

  if (!normalizedDomains.has(normalizedCanonical)) {
    return 'Canonical Domain must be one of the configured Site Domains.'
  }

  return true
}

/**
 * External redirect URLs use the same public-web URL rules, plus a guard for
 * redirecting a Site route back to itself via one of the Site's own domains.
 *
 * Query/hash do not make a same-path redirect safe because redirect matching
 * is route-based and would still re-enter the redirect.
 */
export async function validateExternalRedirectUrl(
  value: string | undefined,
  context: ValidationContext,
): Promise<true | string> {
  if (!value) {
    return true
  }

  const valid = validateWebUrl(value, 'External URL')

  if (valid !== true) {
    return valid
  }

  const sourcePath = normalizeRoutePath(context.document?.sourcePath as string | undefined)

  const site = context.document?.site as ReferenceValue | undefined
  const locale = context.document?.locale as string | undefined

  if (!sourcePath || !site?._ref || !locale) {
    return true
  }

  const siteId = cleanId(site._ref)

  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'drafts',
    })

  const siteRouting = await client.fetch<SiteRouting | null>(
    `
      *[
        _type == "site" &&
        _id == $siteId
      ][0]{
        defaultLocale,
        domains
      }
    `,
    {
      siteId,
    },
  )

  if (!siteRouting?.domains?.length) {
    return true
  }

  const destination = new URL(value)

  const destinationHost = destination.hostname.replace(/\.$/, '').toLowerCase()

  const siteHosts = new Set(
    siteRouting.domains.map((domain) => {
      const parsed = new URL(`https://${domain.trim()}`)

      return parsed.hostname.replace(/\.$/, '').toLowerCase()
    }),
  )

  if (!siteHosts.has(destinationHost)) {
    return true
  }

  const publicSourcePath =
    locale === siteRouting.defaultLocale
      ? sourcePath
      : normalizeRoutePath(`/${locale}${sourcePath === '/' ? '' : sourcePath}`)

  const destinationPath = normalizeRoutePath(destination.pathname)

  if (destinationPath === publicSourcePath) {
    return 'External URL points back to this Redirect’s own public route and would create a redirect loop.'
  }

  return true
}
