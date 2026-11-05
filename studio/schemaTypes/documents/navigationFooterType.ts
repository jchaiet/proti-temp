import {defineArrayMember, defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {NavigationKeyInput} from '../../components/inputs/NavigationKeyInput'
import {validateSiteLocale} from '../validation/siteLocale'
import {validateNavigationKey} from '../validation/navigationKey'
import {validateDocumentInternalPageLinks} from '../validation/internalPageLink'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const navigationFooterType = defineType({
  name: 'navigationFooter',
  title: 'Footer Navigation',
  type: 'document',

  validation: (rule) =>
    rule.custom((document, context) =>
      validateDocumentInternalPageLinks(document, context, {
        documentLabel: 'Footer Navigation',
      }),
    ),

  groups: [
    {
      name: 'assignment',
      title: 'Identity & Locale',
      default: true,
    },
    {
      name: 'content',
      title: 'Footer Content',
    },
  ],

  fields: [
    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'assignment',
      description:
        'Website this Footer Navigation belongs to. Translated versions stay on the same Site.',
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
        'Locale-specific version of this Footer Navigation. Translations reuse the same Key with a different Locale.',

      components: {
        input: PageLocaleInput,
      },

      validation: (rule) =>
        rule.required().custom((locale, context) => validateSiteLocale(locale, context)),
    }),

    defineField({
      name: 'title',
      title: 'Footer Name',
      type: 'string',
      group: 'assignment',
      description:
        'Editor-facing name for this Footer Navigation. It is used in Studio and is not rendered on the website.',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'key',
      title: 'Key',
      type: 'string',
      group: 'assignment',
      description:
        'Stable internal identity shared by translated Footer Navigation documents. Generate it once from the Footer Name, then keep the same Key for every Locale.',
      components: {
        input: NavigationKeyInput,
      },
      validation: (rule) =>
        rule.required().custom((key, context) => validateNavigationKey(key, context)),
    }),

    defineField({
      name: 'logoMode',
      title: 'Logo',
      type: 'string',
      group: 'content',
      initialValue: 'site',
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Use Site Logo',
            value: 'site',
          },
          {
            title: 'Custom Logo',
            value: 'custom',
          },
          {
            title: 'No Logo',
            value: 'none',
          },
        ],
      },
      description: 'Choose the Site logo, a locale-specific custom logo, or no logo.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'logoOverride',
      title: 'Custom Logo',
      type: 'image',
      group: 'content',
      options: {
        hotspot: false,
      },
      hidden: ({document}) => document?.logoMode !== 'custom',
      fields: createAccessibleImageFields('Image'),
      validation: (rule) =>
        rule.custom((value, context) => {
          if (context.document?.logoMode === 'custom' && !value) {
            return 'Select a Custom Logo or change the Logo option.'
          }

          return true
        }),
    }),

    defineField({
      name: 'description',
      title: 'Brand Description',
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (rule) => rule.max(500),
    }),

    defineField({
      name: 'columns',
      title: 'Navigation Columns',
      type: 'array',
      group: 'content',
      description: 'Locale-specific navigation columns rendered in this Footer.',
      of: [
        defineArrayMember({
          type: 'footerColumn',
        }),
      ],
      validation: (rule) => rule.max(8),
    }),

    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'navigationSocialLink',
        }),
      ],
      validation: (rule) => rule.max(12),
    }),

    defineField({
      name: 'legalLinks',
      title: 'Legal Links',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'footerLink',
        }),
      ],
      validation: (rule) => rule.max(12),
    }),

    defineField({
      name: 'copyright',
      title: 'Copyright',
      type: 'string',
      group: 'content',
      description: 'Example: © 2026 Company Name. All rights reserved.',
      validation: (rule) => rule.max(240),
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
    },

    prepare({title, key, site, locale}) {
      return {
        title: title ?? 'Untitled Footer Navigation',
        subtitle: [site, locale, key].filter(Boolean).join(' • '),
      }
    },
  },
})
