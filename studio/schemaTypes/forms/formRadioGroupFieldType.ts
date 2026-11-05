import {defineArrayMember, defineField, defineType} from 'sanity'

import {formFieldNameField, formFieldRequiredField, formFieldWidthField} from './shared'
import {validateDefaultOptionValue, validateUniqueOptionValues} from './validation'

export const formRadioGroupFieldType = defineType({
  name: 'formRadioGroupField',
  title: 'Radio Group',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Group Label',
      type: 'string',
    }),

    formFieldNameField(),

    defineField({
      name: 'options',
      title: 'Options',
      type: 'array',

      of: [
        defineArrayMember({
          type: 'formRadioOption',
        }),
      ],

      validation: (Rule) => Rule.required().min(2).custom(validateUniqueOptionValues),
    }),

    defineField({
      name: 'defaultValue',
      title: 'Default Value',
      type: 'string',

      description: 'Must match the value of one of the radio options.',

      validation: (Rule) =>
        Rule.custom((value, context) =>
          validateDefaultOptionValue(
            value,
            (context.parent as {options?: unknown} | undefined)?.options,
          ),
        ),
    }),

    formFieldRequiredField(),

    formFieldWidthField(),
  ],

  preview: {
    select: {
      label: 'label',
      name: 'name',
      options: 'options',
    },

    prepare({label, name, options}) {
      const count = Array.isArray(options) ? options.length : 0

      return {
        title: label || name || 'Radio Group',

        subtitle: `${count} option${count === 1 ? '' : 's'}${name ? ` · ${name}` : ''}`,
      }
    },
  },
})
