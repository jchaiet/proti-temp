import {useEffect, useMemo, useState} from 'react'

import {Box, Button, Card, Flex, Select, Spinner, Stack, Text, TextInput} from '@sanity/ui'

import {
  insert,
  setIfMissing,
  type ArrayOfObjectsInputProps,
  type ArrayOfObjectsMember,
  useClient,
  useFormValue,
} from 'sanity'

const API_VERSION = '2026-08-21'

export type LocalizedTranslationValue = {
  _key: string

  _type?: string

  locale?: string

  [key: string]: unknown
}

type ReferenceValue = {
  _ref?: string
}

type SiteLocale = {
  code?: string

  label?: string
}

type SiteLocalization = {
  defaultLocale?: string

  locales?: SiteLocale[]
}

export type TranslationStatus = 'missing' | 'partial' | 'complete'

export type LocalizedFieldsInputConfig = {
  translationType: string

  /**
   * First editable field to focus when a translation is opened.
   */
  focusField: string

  isComplete: (
    translation: LocalizedTranslationValue,

    document: Record<string, unknown>,
  ) => boolean
}

type LocalizedFieldsInputProps = {
  inputProps: ArrayOfObjectsInputProps

  config: LocalizedFieldsInputConfig
}

type TranslationIssueCode =
  'missing-locale' | 'default-locale' | 'unsupported-locale' | 'duplicate-locale'

type TranslationIssue = {
  key: string

  code: TranslationIssueCode

  locale?: string

  message: string
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, '') ?? ''
}

function createKey(): string {
  return crypto.randomUUID()
}

export function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return Boolean(value.trim())
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return true
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, nestedValue]) =>
        !['_key', '_type', 'locale'].includes(key) && hasMeaningfulValue(nestedValue),
    )
  }

  return false
}

function getTranslationStatus(
  translation: LocalizedTranslationValue | undefined,

  document: Record<string, unknown>,

  config: LocalizedFieldsInputConfig,
): TranslationStatus {
  if (!translation) {
    return 'missing'
  }

  if (config.isComplete(translation, document)) {
    return 'complete'
  }

  return hasMeaningfulValue(translation) ? 'partial' : 'missing'
}

function getStatusLabel(status: TranslationStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete'

    case 'partial':
      return 'Partial'

    default:
      return 'Missing'
  }
}

function getStatusTone(status: TranslationStatus): 'positive' | 'caution' | 'default' {
  switch (status) {
    case 'complete':
      return 'positive'

    case 'partial':
      return 'caution'

    default:
      return 'default'
  }
}

export function LocalizedFieldsInput({inputProps, config}: LocalizedFieldsInputProps) {
  const {
    members = [],

    onChange,

    onPathFocus,

    readOnly,

    renderDefault,
  } = inputProps

  const client = useClient({
    apiVersion: API_VERSION,
  })

  const site = useFormValue(['site']) as ReferenceValue | undefined

  const documentValue = useFormValue([]) as Record<string, unknown> | undefined

  const siteId = cleanId(site?._ref)

  const [siteLocalization, setSiteLocalization] = useState<SiteLocalization | null>(null)

  const [loading, setLoading] = useState(false)

  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] = useState<'all' | TranslationStatus>('all')

  const [activeKey, setActiveKey] = useState<string | null>(null)

  const [pendingOpenKey, setPendingOpenKey] = useState<string | null>(null)

  const translations = useMemo(
    () => (Array.isArray(inputProps.value) ? inputProps.value : []) as LocalizedTranslationValue[],
    [inputProps.value],
  )

  useEffect(() => {
    if (!siteId) {
      setSiteLocalization(null)

      setLoadError(null)

      return
    }

    let cancelled = false

    async function loadSiteLocalization() {
      setLoading(true)

      setLoadError(null)

      try {
        const value = await client.fetch<SiteLocalization | null>(
          `
              *[
                _type == "site" &&
                _id == $siteId
              ][0]{
                defaultLocale,

                locales[]{
                  code,
                  label
                }
              }
            `,
          {
            siteId,
          },
        )

        if (!cancelled) {
          setSiteLocalization(value)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load Site locales.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSiteLocalization()

    return () => {
      cancelled = true
    }
  }, [client, siteId])

  const supportedLocales = useMemo(
    () =>
      (siteLocalization?.locales ?? [])
        .filter(
          (
            locale,
          ): locale is SiteLocale & {
            code: string
          } => Boolean(locale.code),
        )
        .sort((first, second) =>
          (first.label ?? first.code).localeCompare(second.label ?? second.code),
        ),
    [siteLocalization],
  )

  const locales = useMemo(
    () => supportedLocales.filter((locale) => locale.code !== siteLocalization?.defaultLocale),
    [siteLocalization, supportedLocales],
  )

  const translationCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const translation of translations) {
      if (!translation.locale) {
        continue
      }

      counts.set(translation.locale, (counts.get(translation.locale) ?? 0) + 1)
    }

    return counts
  }, [translations])

  const supportedLocaleCodes = useMemo(
    () => new Set(supportedLocales.map((locale) => locale.code)),
    [supportedLocales],
  )

  const issues = useMemo<TranslationIssue[]>(() => {
    const result: TranslationIssue[] = []

    for (const translation of translations) {
      const locale = translation.locale

      if (!locale) {
        result.push({
          key: translation._key,

          code: 'missing-locale',

          message: 'This translation has no Locale.',
        })

        continue
      }

      if (locale === siteLocalization?.defaultLocale) {
        result.push({
          key: translation._key,

          code: 'default-locale',

          locale,

          message:
            'The Site default Locale should use the base document fields, not a translation entry.',
        })
      }

      if (!supportedLocaleCodes.has(locale)) {
        result.push({
          key: translation._key,

          code: 'unsupported-locale',

          locale,

          message: 'This Locale is no longer supported by the selected Site.',
        })
      }

      if ((translationCounts.get(locale) ?? 0) > 1) {
        result.push({
          key: translation._key,

          code: 'duplicate-locale',

          locale,

          message: 'More than one translation exists for this Locale.',
        })
      }
    }

    return result
  }, [siteLocalization, supportedLocaleCodes, translationCounts, translations])

  const rows = useMemo(() => {
    const document = documentValue ?? {}

    return locales.map((locale) => {
      const translation = translations.find((item) => item.locale === locale.code)

      return {
        locale,

        translation,

        status: getTranslationStatus(translation, document, config),
      }
    })
  }, [config, documentValue, locales, translations])

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [row.locale.label, row.locale.code]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch))
    })
  }, [rows, search, statusFilter])

  const completeCount = rows.filter((row) => row.status === 'complete').length

  const translatedCount = rows.filter((row) => row.status !== 'missing').length

  const activeMember = members.find((member) => member.key === activeKey) as
    ArrayOfObjectsMember | undefined

  const activeMemberOpen = Boolean(activeMember && 'open' in activeMember && activeMember.open)

  useEffect(() => {
    if (!pendingOpenKey) {
      return
    }

    const member = members.find((item) => item.key === pendingOpenKey) as
      ArrayOfObjectsMember | undefined

    if (!member) {
      return
    }

    onPathFocus([
      {
        _key: pendingOpenKey,
      },

      config.focusField,
    ])

    setPendingOpenKey(null)
  }, [config.focusField, members, onPathFocus, pendingOpenKey])

  function openByKey(key: string) {
    setActiveKey(key)

    openByKey(key)
  }

  function openTranslation(localeCode: string) {
    const existing = translations.find((translation) => translation.locale === localeCode)

    if (existing?._key) {
      openByKey(existing._key)

      return
    }

    const key = createKey()

    const item: LocalizedTranslationValue = {
      _key: key,

      _type: config.translationType,

      locale: localeCode,
    }

    onChange([setIfMissing([]), insert([item], 'after', [-1])])

    setPendingOpenKey(key)
  }

  if (!siteId) {
    return (
      <Card padding={3} radius={2} tone="transparent" border>
        <Text muted size={1}>
          Select a Site first. Translation locales are generated from that Site&apos;s
          configuration.
        </Text>
      </Card>
    )
  }

  if (loading) {
    return (
      <Flex align="center" gap={2} padding={3}>
        <Spinner />

        <Text muted size={1}>
          Loading Site locales…
        </Text>
      </Flex>
    )
  }

  if (loadError) {
    return (
      <Card padding={3} radius={2} tone="critical">
        <Text size={1}>{loadError}</Text>
      </Card>
    )
  }

  if (!siteLocalization) {
    return (
      <Card padding={3} radius={2} tone="caution">
        <Text size={1}>The selected Site could not be loaded.</Text>
      </Card>
    )
  }

  return (
    <Stack gap={4}>
      <Card padding={4} radius={2} tone="transparent" border>
        <Stack gap={3}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Stack gap={1}>
              <Text weight="semibold">Translation Coverage</Text>

              <Text muted size={1}>
                {translatedCount} of {rows.length} locales translated · {completeCount} complete
                {issues.length > 0
                  ? ` · ${issues.length} data issue${issues.length === 1 ? '' : 's'}`
                  : ''}
              </Text>
            </Stack>

            <Text muted size={1}>
              Default: {siteLocalization.defaultLocale ?? 'Not configured'}
            </Text>
          </Flex>

          {rows.length > 0 ? (
            <Flex gap={2} wrap="wrap">
              <Box
                flex={1}
                style={{
                  minWidth: 220,
                }}
              >
                <TextInput
                  aria-label="Search translation locales"
                  placeholder="Search locales…"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.currentTarget.value)
                  }}
                />
              </Box>

              <Box
                style={{
                  minWidth: 150,
                }}
              >
                <Select
                  aria-label="Filter translation status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.currentTarget.value as 'all' | TranslationStatus)
                  }}
                >
                  <option value="all">All</option>

                  <option value="missing">Missing</option>

                  <option value="partial">Partial</option>

                  <option value="complete">Complete</option>
                </Select>
              </Box>
            </Flex>
          ) : null}
        </Stack>
      </Card>

      {issues.length > 0 ? (
        <Card padding={4} radius={2} tone="critical" border>
          <Stack gap={3}>
            <Stack gap={1}>
              <Text weight="semibold">Translation data issues</Text>

              <Text muted size={1}>
                These entries are hidden from the normal locale list because their Locale
                configuration is invalid. Edit them so the document can pass validation.
              </Text>
            </Stack>

            <Stack gap={2}>
              {issues.map((issue) => (
                <Card
                  key={`${issue.key}-${issue.code}`}
                  padding={3}
                  radius={2}
                  border
                  tone="transparent"
                >
                  <Flex align="center" gap={3}>
                    <Box flex={1}>
                      <Stack gap={1}>
                        <Text weight="semibold">{issue.locale ?? 'Missing Locale'}</Text>

                        <Text muted size={1}>
                          {issue.message}
                        </Text>
                      </Stack>
                    </Box>

                    <Button
                      disabled={readOnly}
                      mode="ghost"
                      text="Edit"
                      onClick={() => {
                        openByKey(issue.key)
                      }}
                    />
                  </Flex>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <Card padding={3} radius={2} tone="transparent" border>
          <Text muted size={1}>
            This Site has no additional locales. The base fields represent{' '}
            {siteLocalization.defaultLocale ?? 'the default locale'}.
          </Text>
        </Card>
      ) : filteredRows.length > 0 ? (
        <Box
          style={{
            maxHeight: 520,
            overflowY: 'auto',
          }}
        >
          <Stack gap={2}>
            {filteredRows.map((row) => (
              <Card
                key={row.locale.code}
                padding={3}
                radius={2}
                border
                tone={getStatusTone(row.status)}
              >
                <Flex align="center" gap={3}>
                  <Box flex={1}>
                    <Stack gap={1}>
                      <Text weight="semibold">{row.locale.label ?? row.locale.code}</Text>

                      <Text muted size={1}>
                        {row.locale.code} · {getStatusLabel(row.status)}
                      </Text>
                    </Stack>
                  </Box>

                  <Button
                    disabled={readOnly}
                    mode="ghost"
                    text={row.status === 'missing' ? 'Translate' : 'Edit'}
                    onClick={() => {
                      openTranslation(row.locale.code)
                    }}
                  />
                </Flex>
              </Card>
            ))}
          </Stack>
        </Box>
      ) : (
        <Card padding={3} radius={2} tone="transparent" border>
          <Text muted size={1}>
            No locales match the current search and filter.
          </Text>
        </Card>
      )}

      {activeMember && activeMemberOpen
        ? renderDefault({
            ...inputProps,

            members: [activeMember],
          })
        : null}
    </Stack>
  )
}
