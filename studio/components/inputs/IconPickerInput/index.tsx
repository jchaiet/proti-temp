import {Box, Button, Card, Inline, Stack, Text, TextInput} from '@sanity/ui'
import {set, type StringInputProps, unset} from 'sanity'
import {useCallback, useMemo, useState} from 'react'

import {ICON_OPTIONS} from '../../../lib/icons'

type LibraryFilter = 'all' | string

export function IconPickerInput(props: StringInputProps) {
  const {value, onChange, readOnly, elementProps} = props

  const [search, setSearch] = useState('')

  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all')

  const libraries = useMemo(() => {
    return Array.from(new Set(ICON_OPTIONS.map((option) => option.library)))
  }, [])

  const filteredIcons = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return ICON_OPTIONS.filter((option) => {
      const matchesLibrary = libraryFilter === 'all' || option.library === libraryFilter

      if (!matchesLibrary) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return (
        option.label.toLowerCase().includes(normalizedSearch) ||
        option.value.toLowerCase().includes(normalizedSearch) ||
        option.library.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [libraryFilter, search])

  const selectedIcon = useMemo(() => {
    return ICON_OPTIONS.find((option) => option.value === value)
  }, [value])

  const handleSelect = useCallback(
    (nextValue: string) => {
      if (readOnly) {
        return
      }

      onChange(set(nextValue))
    },
    [onChange, readOnly],
  )

  const handleClear = useCallback(() => {
    if (readOnly) {
      return
    }

    onChange(unset())
  }, [onChange, readOnly])

  return (
    <Stack gap={4}>
      {/* Preserve Sanity field focus handling */}
      <Box>
        <TextInput {...elementProps} value={value ?? ''} readOnly placeholder="No icon selected" />
      </Box>

      {/* Current selection */}
      {selectedIcon && (
        <Card border radius={2} padding={3} tone="transparent">
          <Inline gap={3}>
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
              }}
            >
              {selectedIcon.icon}
            </Box>

            <Stack
              gap={2}
              style={{
                flex: 1,
              }}
            >
              <Text size={1} weight="semibold">
                {selectedIcon.label}
              </Text>

              <Text size={1} muted>
                {selectedIcon.value}
              </Text>
            </Stack>

            {!readOnly && (
              <Button text="Remove" mode="ghost" tone="critical" onClick={handleClear} />
            )}
          </Inline>
        </Card>
      )}

      {/* Search */}
      <TextInput
        value={search}
        placeholder="Search icons…"
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      {/* Library filters */}
      <Inline gap={2}>
        <Button
          text="All"
          mode={libraryFilter === 'all' ? 'default' : 'ghost'}
          tone={libraryFilter === 'all' ? 'primary' : 'default'}
          onClick={() => setLibraryFilter('all')}
        />

        {libraries.map((library) => (
          <Button
            key={library}
            text={library}
            mode={libraryFilter === library ? 'default' : 'ghost'}
            tone={libraryFilter === library ? 'primary' : 'default'}
            onClick={() => setLibraryFilter(library)}
          />
        ))}
      </Inline>

      {/* Results */}
      {filteredIcons.length > 0 ? (
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '8px',
          }}
        >
          {filteredIcons.map((option) => {
            const selected = option.value === value

            return (
              <Button
                key={option.value}
                disabled={readOnly}
                mode={selected ? 'default' : 'ghost'}
                tone={selected ? 'primary' : 'default'}
                onClick={() => handleSelect(option.value)}
                style={{
                  minHeight: 72,
                  padding: 8,
                }}
              >
                <Stack
                  gap={2}
                  style={{
                    width: '100%',
                  }}
                >
                  <Box
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: 22,
                    }}
                  >
                    {option.icon}
                  </Box>

                  <Text size={1} align="center" weight={selected ? 'semibold' : 'regular'}>
                    {option.label}
                  </Text>

                  <Text size={0} align="center" muted>
                    {option.library}
                  </Text>
                </Stack>
              </Button>
            )
          })}
        </Box>
      ) : (
        <Card border radius={2} padding={4} tone="transparent">
          <Text size={1} muted align="center">
            No icons match your search.
          </Text>
        </Card>
      )}
    </Stack>
  )
}
