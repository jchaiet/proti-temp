import {defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldWidthField,
} from './shared'
import {validateNumericDefaultWithinBounds, validateNumericMinMax} from './validation'

export const formRangeFieldType = defineType({
  name: 'formRangeField',
  title: 'Range',
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
      title: 'Minimum',
      type: 'number',

      initialValue: 0,

      validation: (Rule) =>
        Rule.custom((value, context) =>
          validateNumericMinMax(value, (context.parent as {max?: unknown} | undefined)?.max),
        ),
    }),

    defineField({
      name: 'max',
      title: 'Maximum',
      type: 'number',

      initialValue: 100,

      validation: (Rule) =>
        Rule.custom((value, context) =>
          validateNumericMinMax((context.parent as {min?: unknown} | undefined)?.min, value),
        ),
    }),

    defineField({
      name: 'step',
      title: 'Step',
      type: 'number',

      initialValue: 1,

      validation: (Rule) => Rule.positive(),
    }),

    defineField({
      name: 'defaultValue',
      title: 'Default Value',
      type: 'number',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                min?: unknown
                max?: unknown
              }
            | undefined

          return validateNumericDefaultWithinBounds(value, parent?.min, parent?.max)
        }),
    }),

    defineField({
      name: 'showValue',
      title: 'Show Current Value',
      type: 'boolean',

      initialValue: true,
    }),

    formFieldRequiredField(),

    formFieldDisabledField(),

    formFieldWidthField(),
  ],

  preview: {
    select: {
      label: 'label',
      name: 'name',
      min: 'min',
      max: 'max',
    },

    prepare({label, name, min, max}) {
      return {
        title: label || name || 'Range',

        subtitle: `${min ?? 0} – ${max ?? 100}${name ? ` · ${name}` : ''}`,
      }
    },
  },
})
