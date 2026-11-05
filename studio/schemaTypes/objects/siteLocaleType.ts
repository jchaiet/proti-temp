import {defineField, defineType} from 'sanity'

import {validateLocaleCode} from '../validation/localeCode'

export const siteLocaleType = defineType({
  name: 'siteLocale',
  title: 'Locale',
  type: 'object',
  fields: [
    defineField({
      name: 'code',
      title: 'Locale Code',
      type: 'string',
      description: 'Regional language code (e.g. en-us, es-us, fil-ph)',
      validation: (rule) => rule.required().custom((code) => validateLocaleCode(code)),
    }),

    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Human-readable name shown to content editors',
      validation: (rule) => rule.required(),
    }),
  ],

  preview: {
    select: {
      title: 'label',
      subtitle: 'code',
    },
  },
})
