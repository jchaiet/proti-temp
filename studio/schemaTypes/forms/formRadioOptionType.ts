import {defineField, defineType} from 'sanity'

import {validateNonBlankText} from './validation'

export const formRadioOptionType = defineType({
  name: 'formRadioOption',
  title: 'Radio Option',
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

    defineField({
      name: 'helperText',
      title: 'Helper Text',
      type: 'string',
    }),

    defineField({
      name: 'disabled',
      title: 'Disabled',
      type: 'boolean',

      initialValue: false,
    }),
  ],

  preview: {
    select: {
      label: 'label',
      value: 'value',
    },

    prepare({label, value}) {
      return {
        title: label || value || 'Radio Option',

        subtitle: value,
      }
    },
  },
})
