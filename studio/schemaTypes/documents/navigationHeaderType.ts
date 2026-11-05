import {defineArrayMember, defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {NavigationKeyInput} from '../../components/inputs/NavigationKeyInput'
import {validateSiteLocale} from '../validation/siteLocale'
import {validateNavigationKey} from '../validation/navigationKey'
import {validateDocumentInternalPageLinks} from '../validation/internalPageLink'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const navigationHeaderType = defineType({
  name: 'navigationHeader',
  title: 'Header Navigation',
  type: 'document',

  validation: (rule) =>
    rule.custom((document, context) =>
      validateDocumentInternalPageLinks(document, context, {
        documentLabel: 'Header Navigation',
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
      title: 'Header Content',
    },
  ],

  fields: [
    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'assignment',
      description:
        'Website this Header Navigation belongs to. Translated versions stay on the same Site.',
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
        'Locale-specific version of this Header Navigation. Translations reuse the same Key with a different Locale.',

      components: {
        input: PageLocaleInput,
      },

      validation: (rule) =>
        rule.required().custom((locale, context) => validateSiteLocale(locale, context)),
    }),

    defineField({
      name: 'title',
      title: 'Header Name',
      type: 'string',
      group: 'assignment',
      description:
        'Editor-facing name for this Header Navigation. It is used in Studio and is not rendered on the website.',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'key',
      title: 'Key',
      type: 'string',
      group: 'assignment',
      description:
        'Stable internal identity shared by translated Header Navigation documents. Generate it once from the Header Name, then keep the same Key for every Locale.',
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
      name: 'align',
      title: 'Navigation Alignment',
      type: 'string',
      group: 'content',
      initialValue: 'center',
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Left',
            value: 'left',
          },
          {
            title: 'Center',
            value: 'center',
          },
          {
            title: 'Right',
            value: 'right',
          },
        ],
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'variant',
      title: 'Navigation Style',
      type: 'string',
      group: 'content',
      initialValue: 'standard',
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Standard',
            value: 'standard',
          },
          {
            title: 'Floating',
            value: 'floating',
          },
          {
            title: 'Glass',
            value: 'glass',
          },
        ],
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'isSticky',
      title: 'Sticky Header',
      type: 'boolean',
      group: 'content',
      initialValue: true,
    }),

    defineField({
      name: 'items',
      title: 'Primary Navigation',
      type: 'array',
      group: 'content',
      description:
        'Top-level Header items. Open an item and choose Navigation Type: Link, Dropdown, or Mega Menu. Within a Mega Menu, add sections containing Links, Tiles, Cards, or a Featured section.',
      of: [
        defineArrayMember({
          type: 'navigationItem',
        }),
      ],
      validation: (rule) => rule.max(12),
    }),

    defineField({
      name: 'utilityActions',
      title: 'Utility Actions',
      type: 'array',
      group: 'content',
      description:
        'Optional locale-specific actions shown on the right side of the Header, such as Login or Get Started.',
      of: [
        defineArrayMember({
          type: 'cta',
        }),
      ],
      validation: (rule) => rule.max(3),
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
      variant: 'variant',
    },

    prepare({title, key, site, locale, variant}) {
      return {
        title: title ?? 'Untitled Header Navigation',
        subtitle: [site, locale, variant, key].filter(Boolean).join(' • '),
      }
    },
  },
})
