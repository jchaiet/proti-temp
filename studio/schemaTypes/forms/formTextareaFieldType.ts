import {defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldSizeField,
  formFieldWidthField,
} from './shared'
import {validateNumericMinMax} from './validation'

export const formTextareaFieldType = defineType({
  name: 'formTextareaField',
  title: 'Textarea',
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
    }),

    defineField({
      name: 'helperText',
      title: 'Helper Text',
      type: 'string',
    }),

    defineField({
      name: 'defaultValue',
      title: 'Default Value',
      type: 'text',
      rows: 3,
    }),

    formFieldRequiredField(),

    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'number',

      initialValue: 3,

      validation: (Rule) => Rule.min(1),
    }),

    defineField({
      name: 'minLength',
      title: 'Minimum Length',
      type: 'number',

      validation: (Rule) =>
        Rule.min(0).custom((value, context) =>
          validateNumericMinMax(
            value,
            (context.parent as {maxLength?: unknown} | undefined)?.maxLength,
            'Minimum Length',
            'Maximum Length',
          ),
        ),
    }),

    defineField({
      name: 'maxLength',
      title: 'Maximum Length',
      type: 'number',

      validation: (Rule) =>
        Rule.min(1).custom((value, context) =>
          validateNumericMinMax(
            (context.parent as {minLength?: unknown} | undefined)?.minLength,
            value,
            'Minimum Length',
            'Maximum Length',
          ),
        ),
    }),

    defineField({
      name: 'autoGrow',
      title: 'Auto Grow',
      type: 'boolean',

      description: 'Automatically increase the height as content is entered.',

      initialValue: false,
    }),

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
        title: label || name || 'Textarea',

        subtitle: name ? `Textarea · ${name}` : 'Textarea',
      }
    },
  },
})
