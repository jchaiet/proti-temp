import {defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {NavigationKeyInput} from '../../components/inputs/NavigationKeyInput'
import {validateSiteLocale} from '../validation/siteLocale'
import {validateNavigationKey} from '../validation/navigationKey'
import {validateNavigationSetReferences} from '../validation/navigationReferences'
import {siteLocaleReferenceFilter} from '../validation/referenceFilters'

export const navigationSetType = defineType({
  name: 'navigationSet',
  title: 'Navigation Set',
  type: 'document',

  validation: (rule) =>
    rule.custom((document, context) => validateNavigationSetReferences(document, context)),

  groups: [
    {
      name: 'assignment',
      title: 'Identity & Locale',
      default: true,
    },
    {
      name: 'composition',
      title: 'Header & Footer',
    },
  ],

  fields: [
    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'assignment',
      description:
        'Website this Navigation Set belongs to. Translated versions stay on the same Site.',
      to: [
        {
          type: 'site',
        },
      ],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      group: 'assignment',
      description:
        'Locale-specific version of this Navigation Set. Translations reuse the same Key with a different Locale.',

      components: {
        input: PageLocaleInput,
      },

      validation: (rule) =>
        rule.required().custom((locale, context) => validateSiteLocale(locale, context)),
    }),

    defineField({
      name: 'title',
      title: 'Navigation Set Name',
      type: 'string',
      group: 'assignment',
      description:
        'Editor-facing name for this Navigation Set. It is used in Studio and is not rendered on the website.',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'key',
      title: 'Key',
      type: 'string',
      group: 'assignment',
      description:
        'Stable internal identity shared by translated Navigation Set documents. Generate it once from the Navigation Set Name, then keep the same Key for every Locale.',
      components: {
        input: NavigationKeyInput,
      },
      validation: (rule) =>
        rule.required().custom((key, context) => validateNavigationKey(key, context)),
    }),

    defineField({
      name: 'headerMode',
      title: 'Header',
      type: 'string',
      group: 'composition',
      initialValue: 'custom',
      description:
        'Choose whether this Navigation Set renders a Header Navigation for its Site and Locale.',

      options: {
        layout: 'radio',
        list: [
          {
            title: 'Use Header Navigation',
            value: 'custom',
          },
          {
            title: 'No Header',
            value: 'none',
          },
        ],
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'header',
      title: 'Header Navigation',
      type: 'reference',
      group: 'composition',
      description:
        'Select a Header Navigation from the same Site and Locale as this Navigation Set.',

      to: [
        {
          type: 'navigationHeader',
        },
      ],

      hidden: ({document}) => document?.headerMode === 'none',

      options: {
        disableNew: true,

        filter: ({document}) => siteLocaleReferenceFilter(document),
      },

      validation: (rule) =>
        rule.custom((value, context) => {
          if (context.document?.headerMode === 'none') {
            return true
          }

          return value ? true : 'Select a Header Navigation.'
        }),
    }),

    defineField({
      name: 'footerMode',
      title: 'Footer',
      type: 'string',
      group: 'composition',
      initialValue: 'custom',
      description:
        'Choose whether this Navigation Set renders a Footer Navigation for its Site and Locale.',

      options: {
        layout: 'radio',
        list: [
          {
            title: 'Use Footer Navigation',
            value: 'custom',
          },
          {
            title: 'No Footer',
            value: 'none',
          },
        ],
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'footer',
      title: 'Footer Navigation',
      type: 'reference',
      group: 'composition',
      description:
        'Select a Footer Navigation from the same Site and Locale as this Navigation Set.',

      to: [
        {
          type: 'navigationFooter',
        },
      ],

      hidden: ({document}) => document?.footerMode === 'none',

      options: {
        disableNew: true,

        filter: ({document}) => siteLocaleReferenceFilter(document),
      },

      validation: (rule) =>
        rule.custom((value, context) => {
          if (context.document?.footerMode === 'none') {
            return true
          }

          return value ? true : 'Select a Footer Navigation.'
        }),
    }),
  ],

  orderings: [
    {
      title: 'Name',
      name: 'titleAsc',
      by: [
        {
          field: 'title',
          direction: 'asc',
        },
      ],
    },
  ],

  preview: {
    select: {
      title: 'title',
      key: 'key',
      site: 'site.name',
      locale: 'locale',
      headerTitle: 'header.title',
      footerTitle: 'footer.title',
      headerMode: 'headerMode',
      footerMode: 'footerMode',
    },

    prepare({title, key, site, locale, headerTitle, footerTitle, headerMode, footerMode}) {
      const header = headerMode === 'none' ? 'No Header' : (headerTitle ?? 'Header not selected')

      const footer = footerMode === 'none' ? 'No Footer' : (footerTitle ?? 'Footer not selected')

      return {
        title: title ?? 'Untitled Navigation Set',

        subtitle: [site, locale, `${header} / ${footer}`, key].filter(Boolean).join(' • '),
      }
    },
  },
})
