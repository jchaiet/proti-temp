import {defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldWidthField,
} from './shared'
import {validateNumericInputDefaultWithinBounds, validateNumericMinMax} from './validation'

const TEXT_BASED_TYPES = ['text', 'email', 'password', 'search', 'tel', 'url']

export const formInputFieldType = defineType({
  name: 'formInputField',
  title: 'Input',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
    }),

    formFieldNameField(),

    defineField({
      name: 'type',
      title: 'Input Type',
      type: 'string',

      initialValue: 'text',

      options: {
        list: [
          {
            title: 'Text',
            value: 'text',
          },
          {
            title: 'Email',
            value: 'email',
          },
          {
            title: 'Telephone',
            value: 'tel',
          },
          {
            title: 'URL',
            value: 'url',
          },
          {
            title: 'Number',
            value: 'number',
          },
          {
            title: 'Password',
            value: 'password',
          },
          {
            title: 'Search',
            value: 'search',
          },
        ],
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'placeholder',
      title: 'Placeholder',
      type: 'string',
    }),

    defineField({
      name: 'helperText',
      title: 'Helper Text',
      type: 'string',
    }),

    defineField({
      name: 'defaultValue',
      title: 'Default Value',
      type: 'string',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                type?: string
                min?: unknown
                max?: unknown
              }
            | undefined

          if (parent?.type !== 'number') {
            return true
          }

          return validateNumericInputDefaultWithinBounds(value, parent?.min, parent?.max)
        }),
    }),

    defineField({
      name: 'autoComplete',
      title: 'Autocomplete',
      type: 'string',

      description:
        'Optional browser autocomplete value, for example "name", "email", "given-name", "family-name", or "tel".',
    }),

    defineField({
      name: 'minLength',
      title: 'Minimum Length',
      type: 'number',

      hidden: ({parent}) => !TEXT_BASED_TYPES.includes(parent?.type ?? 'text'),

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                type?: string
                maxLength?: unknown
              }
            | undefined

          if (!TEXT_BASED_TYPES.includes(parent?.type ?? 'text')) {
            return true
          }

          if (typeof value === 'number' && value < 0) {
            return 'Minimum Length must be at least 0.'
          }

          return validateNumericMinMax(value, parent?.maxLength, 'Minimum Length', 'Maximum Length')
        }),
    }),

    defineField({
      name: 'maxLength',
      title: 'Maximum Length',
      type: 'number',

      hidden: ({parent}) => !TEXT_BASED_TYPES.includes(parent?.type ?? 'text'),

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                type?: string
                minLength?: unknown
              }
            | undefined

          if (!TEXT_BASED_TYPES.includes(parent?.type ?? 'text')) {
            return true
          }

          if (typeof value === 'number' && value < 1) {
            return 'Maximum Length must be at least 1.'
          }

          return validateNumericMinMax(parent?.minLength, value, 'Minimum Length', 'Maximum Length')
        }),
    }),

    defineField({
      name: 'pattern',
      title: 'Validation Pattern',
      type: 'string',

      description: 'Optional HTML regular expression pattern.',

      hidden: ({parent}) => !TEXT_BASED_TYPES.includes(parent?.type ?? 'text'),
    }),

    defineField({
      name: 'min',
      title: 'Minimum',
      type: 'number',

      hidden: ({parent}) => parent?.type !== 'number',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                type?: string
                max?: unknown
              }
            | undefined

          if (parent?.type !== 'number') {
            return true
          }

          return validateNumericMinMax(value, parent?.max)
        }),
    }),

    defineField({
      name: 'max',
      title: 'Maximum',
      type: 'number',

      hidden: ({parent}) => parent?.type !== 'number',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                type?: string
                min?: unknown
              }
            | undefined

          if (parent?.type !== 'number') {
            return true
          }

          return validateNumericMinMax(parent?.min, value)
        }),
    }),

    defineField({
      name: 'step',
      title: 'Step',
      type: 'number',

      hidden: ({parent}) => parent?.type !== 'number',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                type?: string
              }
            | undefined

          if (parent?.type !== 'number') {
            return true
          }

          if (typeof value === 'number' && value <= 0) {
            return 'Step must be greater than 0.'
          }

          return true
        }),
    }),

    defineField({
      name: 'sizeVariant',
      title: 'Size',
      type: 'string',

      initialValue: 'md',

      options: {
        list: [
          {
            title: 'Small',
            value: 'sm',
          },
          {
            title: 'Medium',
            value: 'md',
          },
          {
            title: 'Large',
            value: 'lg',
          },
        ],

        layout: 'radio',
      },
    }),

    formFieldRequiredField(),

    formFieldDisabledField(),

    formFieldWidthField(),
  ],

  preview: {
    select: {
      label: 'label',
      name: 'name',
      type: 'type',
    },

    prepare({label, name, type}) {
      return {
        title: label || name || 'Input',

        subtitle: `${type ?? 'text'}${name ? ` · ${name}` : ''}`,
      }
    },
  },
})
