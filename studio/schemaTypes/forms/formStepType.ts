import {defineArrayMember, defineField, defineType} from 'sanity'

import {validateContainsSubmittableField, validateNonBlankText} from './validation'

export const formStepType = defineType({
  name: 'formStep',
  title: 'Form Step',
  type: 'object',

  fields: [
    defineField({
      name: 'title',
      title: 'Step Title',
      type: 'string',

      validation: (Rule) =>
        Rule.required().custom((value) => validateNonBlankText(value, 'Step Title')),
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'richText',
    }),

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
          type: 'formFieldset',
        }),

        defineArrayMember({
          type: 'formDividerField',
        }),

        defineArrayMember({
          type: 'formSpacerField',
        }),

        defineArrayMember({
          type: 'formHiddenField',
        }),
      ],

      validation: (Rule) =>
        Rule.required()
          .min(1)
          .custom((value) => validateContainsSubmittableField(value, 'Step')),
    }),
  ],

  preview: {
    select: {
      title: 'title',
      fields: 'fields',
    },

    prepare({title, fields}) {
      const count = Array.isArray(fields) ? fields.length : 0

      return {
        title: title || 'Form Step',

        subtitle: `${count} field${count === 1 ? '' : 's'}`,
      }
    },
  },
})
