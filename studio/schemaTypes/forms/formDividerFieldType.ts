import {defineField, defineType} from 'sanity'

export const formDividerFieldType = defineType({
  name: 'formDividerField',
  title: 'Divider',
  type: 'object',

  fields: [
    defineField({
      name: 'text',
      title: 'Text',
      type: 'string',

      description: 'Optional text displayed inside the divider.',
    }),

    defineField({
      name: 'align',
      title: 'Text Alignment',
      type: 'string',

      initialValue: 'center',

      hidden: ({parent}) => !parent?.text,

      options: {
        list: [
          {
            title: 'Start',
            value: 'start',
          },
          {
            title: 'Center',
            value: 'center',
          },
          {
            title: 'End',
            value: 'end',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',

      initialValue: 'solid',

      options: {
        list: [
          {
            title: 'Solid',
            value: 'solid',
          },
          {
            title: 'Dashed',
            value: 'dashed',
          },
          {
            title: 'Dotted',
            value: 'dotted',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'thicknessPx',
      title: 'Thickness',
      type: 'number',

      description: 'Divider thickness in pixels.',

      initialValue: 1,

      validation: (Rule) => Rule.min(1).max(8),
    }),
  ],

  preview: {
    select: {
      text: 'text',
      variant: 'variant',
      thicknessPx: 'thicknessPx',
    },

    prepare({text, variant, thicknessPx}) {
      return {
        title: text || 'Divider',

        subtitle: `${variant ?? 'solid'} · ${thicknessPx ?? 1}px`,
      }
    },
  },
})
