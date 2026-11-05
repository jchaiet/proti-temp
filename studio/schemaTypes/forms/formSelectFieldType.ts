import {defineArrayMember, defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldSizeField,
  formFieldWidthField,
} from './shared'
import {
  validateDefaultOptionValue,
  validateDefaultOptionValues,
  validateUniqueOptionValues,
} from './validation'

export const formSelectFieldType = defineType({
  name: 'formSelectField',
  title: 'Select',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
    }),

    formFieldNameField(),

    defineField({
      name: 'placeholder',
      title: 'Placeholder',
      type: 'string',

      initialValue: 'Select an option...',
    }),

    defineField({
      name: 'helperText',
      title: 'Helper Text',
      type: 'string',
    }),

    defineField({
      name: 'options',
      title: 'Options',
      type: 'array',

      of: [
        defineArrayMember({
          type: 'formSelectOption',
        }),
      ],

      validation: (Rule) => Rule.required().min(1).custom(validateUniqueOptionValues),
    }),

    defineField({
      name: 'multiple',
      title: 'Allow Multiple Selections',
      type: 'boolean',

      initialValue: false,
    }),

    defineField({
      name: 'defaultValue',
      title: 'Default Value',
      type: 'string',

      hidden: ({parent}) => parent?.multiple === true,

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                multiple?: boolean
                options?: unknown
              }
            | undefined

          if (parent?.multiple === true) {
            return true
          }

          return validateDefaultOptionValue(value, parent?.options)
        }),
    }),

    defineField({
      name: 'defaultValues',
      title: 'Default Values',
      type: 'array',

      hidden: ({parent}) => parent?.multiple !== true,

      of: [
        defineArrayMember({
          type: 'string',
        }),
      ],

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                multiple?: boolean
                options?: unknown
              }
            | undefined

          if (parent?.multiple !== true) {
            return true
          }

          return validateDefaultOptionValues(value, parent?.options)
        }),
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
      options: 'options',
      multiple: 'multiple',
    },

    prepare({label, name, options, multiple}) {
      const count = Array.isArray(options) ? options.length : 0

      return {
        title: label || name || 'Select',

        subtitle: `${multiple ? 'Multi Select' : 'Select'} · ${count} option${
          count === 1 ? '' : 's'
        }${name ? ` · ${name}` : ''}`,
      }
    },
  },
})
