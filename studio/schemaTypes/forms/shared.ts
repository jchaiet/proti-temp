import {defineField} from 'sanity'

import {validateSubmittedFieldName} from './validation'

export const formFieldNameField = () =>
  defineField({
    name: 'name',
    title: 'Field Name',
    type: 'string',

    description: 'The name used when this field is submitted, for example "email" or "firstName".',

    validation: (Rule) => Rule.required().custom(validateSubmittedFieldName),
  })

export const formFieldWidthField = () =>
  defineField({
    name: 'colSpan',
    title: 'Width',
    type: 'number',

    initialValue: 2,

    options: {
      list: [
        {
          title: 'Half Width',
          value: 1,
        },
        {
          title: 'Full Width',
          value: 2,
        },
      ],

      layout: 'radio',
    },
  })

export const formFieldRequiredField = () =>
  defineField({
    name: 'required',
    title: 'Required',
    type: 'boolean',

    initialValue: false,
  })

export const formFieldDisabledField = () =>
  defineField({
    name: 'disabled',
    title: 'Disabled',
    type: 'boolean',

    initialValue: false,
  })

export const formFieldSizeField = (name = 'size', title = 'Size') =>
  defineField({
    name,
    title,
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
  })
