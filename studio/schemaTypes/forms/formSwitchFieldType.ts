import {defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldWidthField,
} from './shared'

export const formSwitchFieldType = defineType({
  name: 'formSwitchField',
  title: 'Switch',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
    }),

    formFieldNameField(),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'string',
    }),

    defineField({
      name: 'value',
      title: 'Submitted Value',
      type: 'string',

      initialValue: 'on',

      description: 'Value submitted when the switch is enabled.',
    }),

    defineField({
      name: 'defaultChecked',
      title: 'Enabled by Default',
      type: 'boolean',

      initialValue: false,
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

    defineField({
      name: 'labelPlacement',
      title: 'Label Placement',
      type: 'string',

      initialValue: 'end',

      options: {
        list: [
          {
            title: 'Before Switch',
            value: 'start',
          },
          {
            title: 'After Switch',
            value: 'end',
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
    },

    prepare({label, name}) {
      return {
        title: label || name || 'Switch',

        subtitle: name ? `Switch · ${name}` : 'Switch',
      }
    },
  },
})
