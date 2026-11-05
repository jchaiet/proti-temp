import {useEffect, useMemo, useState} from 'react'

import {Box, Card, Checkbox, Flex, Spinner, Stack, Text, TextInput} from '@sanity/ui'

import {set, unset, type ArrayOfObjectsInputProps, useClient, useFormValue} from 'sanity'

import {buildTaxonomyPath, type TaxonomyPathNode} from '../../utils/taxonomyPath'

const API_VERSION = '2026-08-21'

type ReferenceValue = {
  _key?: string
  _type?: 'reference'
  _ref?: string
}

type TaxonomyOption = TaxonomyPathNode & {
  title: string
  kind?: 'term' | 'group'
  includeInFilters?: boolean
  path?: string
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, '') ?? ''
}

function createKey(): string {
  return crypto.randomUUID()
}

export function TaxonomyFilterPickerInput(props: ArrayOfObjectsInputProps) {
  const {onChange, readOnly} = props

  const client = useClient({
    apiVersion: API_VERSION,
  })

  const site = useFormValue(['site']) as
    | {
        _ref?: string
      }
    | undefined

  const localeValue = useFormValue(['locale'])

  const siteId = cleanId(site?._ref)

  const locale = typeof localeValue === 'string' ? localeValue : ''

  const [options, setOptions] = useState<TaxonomyOption[]>([])

  const [loading, setLoading] = useState(false)

  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  const references = useMemo(
    () => (Array.isArray(props.value) ? (props.value as ReferenceValue[]) : []),
    [props.value],
  )

  const selectedIds = useMemo(
    () => new Set(references.map((reference) => cleanId(reference._ref)).filter(Boolean)),
    [references],
  )

  useEffect(() => {
    if (!siteId) {
      setOptions([])

      setLoadError(null)

      return
    }

    let cancelled = false

    async function loadTaxonomy() {
      setLoading(true)

      setLoadError(null)

      try {
        const result = await client.fetch<TaxonomyOption[]>(
          `
            *[
              _type == "taxonomy" &&
              site._ref == $siteId
            ] {
              _id,

              "title": coalesce(
                translations[
                  locale == $locale
                ][0].title,
                title
              ),

              "slug": slug.current,

              "parentId": parent._ref,

              "kind": coalesce(kind, "term"),

              includeInFilters
            }
          `,
          {
            siteId,
            locale,
          },
        )

        if (!cancelled) {
          const selectableOptions = result
            .filter((option) => option.kind !== 'group' && option.includeInFilters !== false)
            .map((option) => ({
              ...option,
              path: buildTaxonomyPath(option._id, result),
            }))
            .sort((left, right) =>
              (left.path ?? left.title).localeCompare(right.path ?? right.title),
            )

          setOptions(selectableOptions)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load Taxonomy Terms.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadTaxonomy()

    return () => {
      cancelled = true
    }
  }, [client, locale, siteId])

  const visibleOptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    if (!query) {
      return options
    }

    return options.filter((option) =>
      [option.title, option.path]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(query)),
    )
  }, [options, search])

  const toggleTaxonomy = (taxonomyId: string) => {
    const cleanTaxonomyId = cleanId(taxonomyId)

    if (!cleanTaxonomyId) {
      return
    }

    const isSelected = selectedIds.has(cleanTaxonomyId)

    const nextReferences = isSelected
      ? references.filter((reference) => cleanId(reference._ref) !== cleanTaxonomyId)
      : [
          ...references,
          {
            _key: createKey(),
            _type: 'reference' as const,
            _ref: cleanTaxonomyId,
          },
        ]

    onChange(nextReferences.length > 0 ? set(nextReferences) : unset())
  }

  if (!siteId) {
    return (
      <Card padding={3} radius={2} tone="caution">
        <Text size={1}>Select a Site before choosing Taxonomy filters.</Text>
      </Card>
    )
  }

  return (
    <Stack gap={3}>
      <TextInput
        value={search}
        placeholder="Filter Taxonomy Terms..."
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      {loading ? (
        <Flex align="center" gap={2}>
          <Spinner muted />

          <Text muted size={1}>
            Loading Taxonomy Terms...
          </Text>
        </Flex>
      ) : null}

      {loadError ? (
        <Card padding={3} radius={2} tone="critical">
          <Text size={1}>{loadError}</Text>
        </Card>
      ) : null}

      {!loading && !loadError && visibleOptions.length === 0 ? (
        <Card padding={3} radius={2} tone="transparent">
          <Text muted size={1}>
            No Taxonomy Terms found.
          </Text>
        </Card>
      ) : null}

      {!loading && !loadError && visibleOptions.length > 0 ? (
        <Card border padding={2} radius={2}>
          <Stack gap={2}>
            {visibleOptions.map((option) => {
              const id = cleanId(option._id)

              const checked = selectedIds.has(id)

              return (
                <Flex key={id} align="center" gap={3} padding={2}>
                  <Checkbox
                    checked={checked}
                    disabled={readOnly}
                    onChange={() => toggleTaxonomy(id)}
                  />

                  <Box flex={1}>
                    <Stack gap={2}>
                      <Text size={1} weight="medium">
                        {option.title}
                      </Text>

                      {option.path ? (
                        <Text muted size={0}>
                          {option.path}
                        </Text>
                      ) : null}
                    </Stack>
                  </Box>
                </Flex>
              )
            })}
          </Stack>
        </Card>
      ) : null}
    </Stack>
  )
}
