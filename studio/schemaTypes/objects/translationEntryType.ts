import {defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {translationDocumentReferenceFilter} from '../validation/translationGroups'

export const translationEntryType = defineType({
  name: 'translationEntry',
  title: 'Translation',
  type: 'object',

  fields: [
    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      description: 'Locale represented by this content document.',

      components: {
        input: PageLocaleInput,
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'document',
      title: 'Document',
      type: 'reference',

      description: 'Published Page or Blog that represents this translation.',

      to: [
        {
          type: 'page',
        },
        {
          type: 'blog',
        },
      ],

      options: {
        disableNew: true,

        filter: ({document, parent}) => translationDocumentReferenceFilter(document, parent),
      },

      validation: (rule) => rule.required(),
    }),
  ],

  preview: {
    select: {
      locale: 'locale',
      title: 'document.title',
      type: 'document._type',
    },

    prepare({locale, title, type}) {
      return {
        title: title ?? 'Translation',

        subtitle: [locale, type].filter(Boolean).join(' • '),
      }
    },
  },
})
