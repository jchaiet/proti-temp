import {defineField, defineType} from 'sanity'

import {validateNonBlankText} from './validation'

export const formSelectOptionType = defineType({
  name: 'formSelectOption',
  title: 'Select Option',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',

      validation: (Rule) =>
        Rule.required().custom((value) => validateNonBlankText(value, 'Option Label')),
    }),

    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',

      validation: (Rule) =>
        Rule.required().custom((value) => validateNonBlankText(value, 'Option Value')),
    }),
  ],

  preview: {
    select: {
      label: 'label',
      value: 'value',
    },

    prepare({label, value}) {
      return {
        title: label || value || 'Select Option',

        subtitle: value,
      }
    },
  },
})
