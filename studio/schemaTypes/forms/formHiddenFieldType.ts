import {defineField, defineType} from 'sanity'

import {formFieldNameField} from './shared'

export const formHiddenFieldType = defineType({
  name: 'formHiddenField',
  title: 'Hidden Field',
  type: 'object',

  fields: [
    formFieldNameField(),

    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',

      description: 'The value submitted with the form.',

      validation: (Rule) => Rule.required(),
    }),
  ],

  preview: {
    select: {
      name: 'name',
      value: 'value',
    },

    prepare({name, value}) {
      return {
        title: name || 'Hidden Field',

        subtitle: value !== undefined ? `Hidden · ${value}` : 'Hidden',
      }
    },
  },
})
