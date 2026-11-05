import {StringInputProps, useFormValue} from 'sanity'

type SiteLocale = {
  _key?: string
  code?: string
  label?: string
}

export function DefaultLocaleInput(props: StringInputProps) {
  const locales = useFormValue(['locales']) as SiteLocale[] | undefined
  const localeOptions = (locales ?? [])
    .filter((locale): locale is SiteLocale & {code: string} => Boolean(locale.code))
    .map((locale) => ({
      title: locale.label ? `${locale.label} (${locale.code})` : locale.code,
      value: locale.code,
    }))

  return props.renderDefault({
    ...props,
    schemaType: {
      ...props.schemaType,
      options: {
        ...props.schemaType.options,
        list: localeOptions,
      },
    },
  })
}
