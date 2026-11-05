import {defineField, defineType} from 'sanity'

import {validateInternalPageLink} from '../validation/internalPageLink'
import {siteLocaleReferenceFilter} from '../validation/referenceFilters'
import {validateWebUrl} from '../validation/webUrls'

export const linkType = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',

  validation: (rule) => rule.custom((value, context) => validateInternalPageLink(value, context)),

  fields: [
    defineField({
      name: 'type',
      title: 'Link Type',
      type: 'string',

      initialValue: 'internal',

      options: {
        list: [
          {
            title: 'Internal Page',
            value: 'internal',
          },
          {
            title: 'External URL',
            value: 'external',
          },
          {
            title: 'Email',
            value: 'email',
          },
          {
            title: 'Phone',
            value: 'phone',
          },
          {
            title: 'Anchor',
            value: 'anchor',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'internalPage',
      title: 'Internal Page',
      type: 'reference',

      to: [
        {
          type: 'page',
        },
      ],

      options: {
        disableNew: true,

        filter: ({document}) => siteLocaleReferenceFilter(document),
      },

      hidden: ({parent}) => parent?.type !== 'internal',
    }),

    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',

      hidden: ({parent}) => parent?.type !== 'external',

      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        })
          .custom((value, context) => {
            const parent = context.parent as {type?: string} | undefined

            if (parent?.type === 'external' && !value) {
              return 'External URL is required.'
            }

            return true
          })
          .custom((value) => validateWebUrl(value, 'External URL')),
    }),

    defineField({
      name: 'email',
      title: 'Email Address',
      type: 'string',

      hidden: ({parent}) => parent?.type !== 'email',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {type?: string} | undefined

          if (parent?.type === 'email' && !value) {
            return 'Email address is required.'
          }

          return true
        }),
    }),

    defineField({
      name: 'phone',
      title: 'Phone Number',
      type: 'string',

      hidden: ({parent}) => parent?.type !== 'phone',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {type?: string} | undefined

          if (parent?.type === 'phone' && !value) {
            return 'Phone number is required.'
          }

          return true
        }),
    }),

    defineField({
      name: 'anchor',
      title: 'Anchor',
      type: 'string',

      description: 'Enter the anchor without "#".',

      hidden: ({parent}) => parent?.type !== 'anchor',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {type?: string} | undefined

          if (parent?.type === 'anchor' && !value) {
            return 'Anchor is required.'
          }

          return true
        }),
    }),

    defineField({
      name: 'openInNewTab',
      title: 'Open in New Tab',
      type: 'boolean',
      initialValue: false,

      hidden: ({parent}) => parent?.type !== 'external',
    }),
  ],

  preview: {
    select: {
      type: 'type',
      internalTitle: 'internalPage.title',
      externalUrl: 'externalUrl',
      email: 'email',
      phone: 'phone',
      anchor: 'anchor',
    },

    prepare({type, internalTitle, externalUrl, email, phone, anchor}) {
      switch (type) {
        case 'internal':
          return {
            title: internalTitle || 'Internal Page',
            subtitle: 'Internal Link',
          }

        case 'external':
          return {
            title: externalUrl || 'External URL',
            subtitle: 'External Link',
          }

        case 'email':
          return {
            title: email || 'Email',
            subtitle: 'Email Link',
          }

        case 'phone':
          return {
            title: phone || 'Phone',
            subtitle: 'Phone Link',
          }

        case 'anchor':
          return {
            title: anchor ? `#${anchor}` : 'Anchor',
            subtitle: 'Anchor Link',
          }

        case 'none':
          return {
            title: 'Legacy No Link',
            subtitle: 'Select a current Link Type to replace this legacy value.',
          }

        default:
          return {
            title: 'Select Link Destination',
          }
      }
    },
  },
})
