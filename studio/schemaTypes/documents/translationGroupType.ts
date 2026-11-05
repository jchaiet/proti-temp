import {defineArrayMember, defineField, defineType} from 'sanity'

import {validateTranslationGroupEntries} from '../validation/translationGroups'

export const translationGroupType = defineType({
  name: 'translationGroup',

  title: 'Translation Group',

  type: 'document',

  fields: [
    defineField({
      name: 'title',

      title: 'Internal Name',

      type: 'string',

      description: 'Internal label for editors. Example: Widget Product Page.',

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'site',

      title: 'Site',

      type: 'reference',

      to: [
        {
          type: 'site',
        },
      ],

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'contentType',

      title: 'Content Type',

      type: 'string',

      description: 'A Translation Group contains only one document type.',

      options: {
        layout: 'radio',

        list: [
          {
            title: 'Page',

            value: 'page',
          },
          {
            title: 'Blog',

            value: 'blog',
          },
        ],
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'translations',

      title: 'Translations',

      type: 'array',

      description: 'Connect the localized versions of the same piece of content.',

      of: [
        defineArrayMember({
          type: 'translationEntry',
        }),
      ],

      validation: (rule) => rule.required().min(1).custom(validateTranslationGroupEntries),
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

      site: 'site.name',

      contentType: 'contentType',

      count: 'translations',
    },

    prepare({title, site, contentType, count}) {
      const total = Array.isArray(count) ? count.length : 0

      return {
        title: title ?? 'Translation Group',

        subtitle: [site, contentType, `${total} translation${total === 1 ? '' : 's'}`]
          .filter(Boolean)
          .join(' • '),
      }
    },
  },
})
