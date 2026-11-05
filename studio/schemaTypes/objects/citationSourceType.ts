import {defineField, defineType} from 'sanity'

import {validateWebUrl} from '../validation/webUrls'

export const citationSourceType = defineType({
  name: 'citationSource',
  title: 'Citation Source',
  type: 'object',

  fields: [
    defineField({
      name: 'title',
      title: 'Source Title',
      type: 'string',
      description:
        'Title of the publication, article, report, guideline, or other referenced work.',
      validation: (rule) => rule.required().max(300),
    }),

    defineField({
      name: 'publisher',
      title: 'Publisher / Organization',
      type: 'string',
      description: 'Optional organization or publisher responsible for the source.',
      validation: (rule) => rule.max(200),
    }),

    defineField({
      name: 'publicationDate',
      title: 'Publication Date',
      type: 'date',
      description: 'Optional publication date when it is known.',
    }),

    defineField({
      name: 'url',
      title: 'Source URL',
      type: 'url',
      description: 'Optional public URL for the source.',
      validation: (rule) =>
        rule
          .uri({
            scheme: ['http', 'https'],
          })
          .custom((value) => validateWebUrl(value, 'Source URL')),
    }),
  ],

  preview: {
    select: {
      title: 'title',
      publisher: 'publisher',
      publicationDate: 'publicationDate',
    },

    prepare({title, publisher, publicationDate}) {
      return {
        title: title || 'Citation Source',
        subtitle: [publisher, publicationDate].filter(Boolean).join(' • '),
      }
    },
  },
})
