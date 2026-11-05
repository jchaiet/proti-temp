import {defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldWidthField,
} from './shared'

export const formCheckboxFieldType = defineType({
  name: 'formCheckboxField',
  title: 'Checkbox',
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
      name: 'value',
      title: 'Submitted Value',
      type: 'string',

      description: 'Value submitted when the checkbox is checked.',

      initialValue: 'on',
    }),

    defineField({
      name: 'defaultChecked',
      title: 'Checked by Default',
      type: 'boolean',

      initialValue: false,
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
        title: label || name || 'Checkbox',

        subtitle: name ? `Checkbox · ${name}` : 'Checkbox',
      }
    },
  },
})
