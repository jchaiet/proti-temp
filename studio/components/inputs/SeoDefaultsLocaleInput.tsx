import {Select} from '@sanity/ui'
import {useCallback} from 'react'
import {set, StringInputProps, unset, useFormValue} from 'sanity'

type SiteLocale = {
  code?: string
  label?: string
}

export function SeoDefaultsLocaleInput(props: StringInputProps) {
  const {value, onChange, elementProps} = props

  const locales = (useFormValue(['locales']) as SiteLocale[] | undefined) ?? []

  const availableLocales = locales.filter(
    (
      locale,
    ): locale is SiteLocale & {
      code: string
    } => Boolean(locale.code),
  )

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextValue = event.currentTarget.value

      onChange(nextValue ? set(nextValue) : unset())
    },
    [onChange],
  )

  return (
    <Select {...elementProps} value={value ?? ''} onChange={handleChange}>
      <option value="">Select a locale</option>

      {availableLocales.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.label ? `${locale.label} (${locale.code})` : locale.code}
        </option>
      ))}
    </Select>
  )
}
