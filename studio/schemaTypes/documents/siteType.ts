import {defineArrayMember, defineField, defineType} from 'sanity'
import {DefaultLocaleInput} from '../../components/inputs/DefaultLocaleInput'
import {SiteKeyInput} from '../../components/inputs/SiteKeyInput'
import {validateSiteNavigationDefaults} from '../validation/navigationReferences'
import {siteOwnedReferenceFilter} from '../validation/referenceFilters'
import {validateCanonicalDomain, validateSiteDomains} from '../validation/webUrls'

type SiteLocale = {
  code?: string
  label?: string
}

export const siteType = defineType({
  name: 'site',
  title: 'Site',
  type: 'document',

  validation: (rule) =>
    rule.custom((document, context) => validateSiteNavigationDefaults(document, context)),

  groups: [
    {
      name: 'identity',
      title: 'Identity',
      default: true,
    },
    {
      name: 'routing',
      title: 'Routing',
    },
    {
      name: 'localization',
      title: 'Localization',
    },
    {
      name: 'navigation',
      title: 'Navigation',
    },
    {
      name: 'seo',
      title: 'SEO',
    },
    {
      name: 'structuredData',
      title: 'Structured Data',
    },
  ],

  fields: [
    defineField({
      name: 'name',
      title: 'Site Name',
      type: 'string',
      group: 'identity',
      description: 'Human-readable website name',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'key',
      title: 'Site Key',
      type: 'string',
      group: 'identity',
      description: 'Stable machine-readable identifier (e.g. acme, company-a, corporate)',
      components: {
        input: SiteKeyInput,
      },
      validation: (rule) =>
        rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'site key',
        }),
    }),

    defineField({
      name: 'domains',
      title: 'Domains',
      type: 'array',
      group: 'routing',
      description: 'Hostnames that should resolve to this site. Do not include http:// or https://',
      of: [
        defineArrayMember({
          type: 'string',
        }),
      ],
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .unique()
          .custom((values) => validateSiteDomains(values as string[] | undefined)),
    }),

    defineField({
      name: 'canonicalDomain',
      title: 'Canonical Domain',
      type: 'string',
      group: 'routing',
      description:
        'Primary hostname used for canonical URLs, hreflang, sitemap URLs, robots.txt, and structured data. Must match one of the configured Domains.',
      validation: (rule) =>
        rule
          .required()
          .custom((value, context) =>
            validateCanonicalDomain(
              value,
              (context.document?.domains as string[] | undefined) ?? [],
            ),
          ),
    }),

    defineField({
      name: 'locales',
      title: 'Supported Locales',
      type: 'array',
      group: 'localization',
      description: 'Regional languages supported by this website',
      of: [
        defineArrayMember({
          type: 'siteLocale',
        }),
      ],
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .custom((locales: SiteLocale[] | undefined) => {
            if (!locales) {
              return true
            }

            const codes = locales.map((locale) => locale.code).filter(Boolean)

            if (codes.length !== new Set(codes).size) {
              return 'Locale codes must be unique'
            }

            return true
          }),
    }),

    defineField({
      name: 'defaultLocale',
      title: 'Default Locale',
      type: 'string',
      group: 'localization',
      description: 'Primary locale for this Site. The default locale is omitted from public URLs.',
      components: {
        input: DefaultLocaleInput,
      },
      validation: (rule) =>
        rule.required().custom((defaultLocale, context) => {
          if (!defaultLocale) {
            return true
          }

          const locales = (context.document?.locales as SiteLocale[] | undefined) ?? []

          const localeExists = locales.some((locale) => locale.code === defaultLocale)

          if (!localeExists) {
            return 'Default locale must be one of the supported locales.'
          }

          return true
        }),
    }),

    defineField({
      name: 'defaultNavigationSets',
      title: 'Default Navigation by Locale',
      type: 'array',
      group: 'navigation',
      description:
        'Select a Navigation Set for each Locale that should have inherited navigation. Pages using Inherit Site + Locale Default use the set matching their Locale.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'navigationSet'}],
          options: {
            disableNew: true,
            filter: ({document}) => siteOwnedReferenceFilter(document),
          },
        }),
      ],
      validation: (rule) => rule.unique(),
    }),

    defineField({
      name: 'seoDefaults',
      title: 'SEO Defaults',
      type: 'array',
      group: 'seo',
      description:
        'Locale-specific SEO defaults inherited by Pages and Blogs when they do not provide document-level overrides.',
      of: [
        defineArrayMember({
          type: 'siteSeoDefaults',
        }),
      ],
      validation: (rule) =>
        rule.custom((values) => {
          if (!Array.isArray(values)) {
            return true
          }

          const locales = values
            .map((value) =>
              typeof value === 'object' && value ? (value as {locale?: string}).locale : undefined,
            )
            .filter((locale): locale is string => Boolean(locale))

          return locales.length === new Set(locales).size
            ? true
            : 'Only one SEO Defaults entry is allowed per Locale.'
        }),
    }),

    defineField({
      name: 'organization',
      title: 'Organization',
      type: 'organizationStructuredData',
      group: 'structuredData',
      description:
        'Organization identity used to enrich schema.org Organization structured data across this Site.',
    }),
  ],

  preview: {
    select: {
      title: 'name',
      subtitle: 'key',
    },
  },
})
