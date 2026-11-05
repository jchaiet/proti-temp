import {defineField, defineType} from 'sanity'

export const formSpacerFieldType = defineType({
  name: 'formSpacerField',
  title: 'Spacer',
  type: 'object',

  fields: [
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',

      initialValue: 'md',

      options: {
        list: [
          {
            title: '3X Small',
            value: '3xs',
          },
          {
            title: '2X Small',
            value: '2xs',
          },
          {
            title: 'Extra Small',
            value: 'xs',
          },
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
          {
            title: 'Extra Large',
            value: 'xl',
          },
          {
            title: '2X Large',
            value: '2xl',
          },
          {
            title: '3X Large',
            value: '3xl',
          },
        ],

        layout: 'radio',
      },
    }),
  ],

  preview: {
    select: {
      size: 'size',
    },

    prepare({size}) {
      return {
        title: 'Spacer',

        subtitle: `Vertical · ${size ?? 'md'}`,
      }
    },
  },
})
