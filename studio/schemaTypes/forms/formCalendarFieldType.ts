import {defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldWidthField,
} from './shared'
import {validateDateDefaultWithinBounds, validateDateMinMax} from './validation'

export const formCalendarFieldType = defineType({
  name: 'formCalendarField',
  title: 'Calendar',
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
      name: 'defaultValue',
      title: 'Default Date',
      type: 'date',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                minDate?: unknown
                maxDate?: unknown
              }
            | undefined

          return validateDateDefaultWithinBounds(value, parent?.minDate, parent?.maxDate)
        }),
    }),

    defineField({
      name: 'minDate',
      title: 'Minimum Date',
      type: 'date',

      validation: (Rule) =>
        Rule.custom((value, context) =>
          validateDateMinMax(value, (context.parent as {maxDate?: unknown} | undefined)?.maxDate),
        ),
    }),

    defineField({
      name: 'maxDate',
      title: 'Maximum Date',
      type: 'date',

      validation: (Rule) =>
        Rule.custom((value, context) =>
          validateDateMinMax((context.parent as {minDate?: unknown} | undefined)?.minDate, value),
        ),
    }),

    formFieldRequiredField(),

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
        title: label || name || 'Calendar',

        subtitle: name ? `Calendar · ${name}` : 'Calendar',
      }
    },
  },
})
