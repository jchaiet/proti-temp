import {defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldSizeField,
  formFieldWidthField,
} from './shared'
import {validateDateMinMax} from './validation'

export const formDatePickerFieldType = defineType({
  name: 'formDatePickerField',
  title: 'Date Picker',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
    }),

    formFieldNameField(),

    defineField({
      name: 'helperText',
      title: 'Helper Text',
      type: 'string',
    }),

    defineField({
      name: 'min',
      title: 'Minimum Date',
      type: 'date',

      validation: (Rule) =>
        Rule.custom((value, context) =>
          validateDateMinMax(value, (context.parent as {max?: unknown} | undefined)?.max),
        ),
    }),

    defineField({
      name: 'max',
      title: 'Maximum Date',
      type: 'date',

      validation: (Rule) =>
        Rule.custom((value, context) =>
          validateDateMinMax((context.parent as {min?: unknown} | undefined)?.min, value),
        ),
    }),

    formFieldRequiredField(),

    formFieldSizeField(),

    formFieldDisabledField(),

    formFieldWidthField(),
  ],

  preview: {
    select: {
      label: 'label',
      name: 'name',
    },

    prepare({label, name}) {
      return {
        title: label || name || 'Date Picker',

        subtitle: name ? `Date Picker · ${name}` : 'Date Picker',
      }
    },
  },
})
