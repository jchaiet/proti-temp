import {defineArrayMember, defineField, defineType} from 'sanity'

import {formFieldDisabledField, formFieldSizeField, formFieldWidthField} from './shared'
import {validateContainsSubmittableField, validateNonBlankText} from './validation'

export const formFieldsetType = defineType({
  name: 'formFieldset',
  title: 'Fieldset',
  type: 'object',

  fields: [
    defineField({
      name: 'name',
      title: 'Fieldset Key',
      type: 'string',

      description: 'Internal unique key for this fieldset. This value is not submitted.',

      validation: (Rule) =>
        Rule.required().custom((value) => validateNonBlankText(value, 'Fieldset Key')),
    }),

    defineField({
      name: 'legend',
      title: 'Legend',
      type: 'string',

      validation: (Rule) =>
        Rule.required().custom((value) => validateNonBlankText(value, 'Legend')),
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'string',
    }),

    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',

      initialValue: 'standard',

      options: {
        list: [
          {
            title: 'Standard',
            value: 'standard',
          },
          {
            title: 'Bordered',
            value: 'bordered',
          },
        ],

        layout: 'radio',
      },
    }),

    formFieldSizeField(),

    formFieldDisabledField(),

    formFieldWidthField(),

    defineField({
      name: 'fields',
      title: 'Fields',
      type: 'array',

      of: [
        defineArrayMember({
          type: 'formInputField',
        }),

        defineArrayMember({
          type: 'formTextareaField',
        }),

        defineArrayMember({
          type: 'formCheckboxField',
        }),

        defineArrayMember({
          type: 'formDatePickerField',
        }),

        defineArrayMember({
          type: 'formCalendarField',
        }),

        defineArrayMember({
          type: 'formFileUploadField',
        }),

        defineArrayMember({
          type: 'formRadioGroupField',
        }),

        defineArrayMember({
          type: 'formRangeField',
        }),

        defineArrayMember({
          type: 'formSelectField',
        }),

        defineArrayMember({
          type: 'formSwitchField',
        }),

        defineArrayMember({
          type: 'formDividerField',
        }),

        defineArrayMember({
          type: 'formSpacerField',
        }),
      ],

      validation: (Rule) =>
        Rule.required()
          .min(1)
          .custom((value) => validateContainsSubmittableField(value, 'Fieldset')),
    }),
  ],

  preview: {
    select: {
      legend: 'legend',
      fields: 'fields',
    },

    prepare({legend, fields}) {
      const count = Array.isArray(fields) ? fields.length : 0

      return {
        title: legend || 'Fieldset',

        subtitle: `${count} field${count === 1 ? '' : 's'}`,
      }
    },
  },
})
