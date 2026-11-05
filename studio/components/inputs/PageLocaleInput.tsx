import {useEffect, useState} from 'react'
import {type StringInputProps, useClient, useFormValue} from 'sanity'

type SiteReference = {
  _ref?: string
}

type SiteLocale = {
  code?: string
  label?: string
}

export function PageLocaleInput(props: StringInputProps) {
  const client = useClient({
    apiVersion: '2026-08-20',
  })

  const site = useFormValue(['site']) as SiteReference | undefined

  const [locales, setLocales] = useState<SiteLocale[]>([])

  useEffect(() => {
    let active = true

    async function loadLocales() {
      if (!site?._ref) {
        setLocales([])
        return
      }

      const siteId = site._ref.replace(/^drafts\./, '')

      const result = await client
        .withConfig({
          perspective: 'drafts',
        })
        .fetch<SiteLocale[]>(
          `*[
                    _type == "site" &&
                    _id == $siteId
                ][0].locales[]{
                    code,
                    label
                }`,
          {
            siteId,
          },
        )

      if (active) {
        setLocales(result ?? [])
      }
    }

    loadLocales()

    return () => {
      active = false
    }
  }, [client, site?._ref])

  const localeOptions = locales
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
