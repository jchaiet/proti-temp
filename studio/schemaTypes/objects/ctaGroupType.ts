import {defineArrayMember, defineField, defineType} from 'sanity'

export const ctaGroupType = defineType({
  name: 'ctaGroup',
  title: 'Calls to Action',
  type: 'object',

  fields: [
    defineField({
      name: 'items',
      title: 'Calls to Action',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'cta',
        }),
      ],
      validation: (rule) =>
        rule
          .max(3)
          .warning('More than three calls to action may make the content difficult to scan.'),
    }),

    defineField({
      name: 'alignment',
      title: 'Alignment',
      type: 'string',
      description:
        'Controls only this Call to Action group. Leave unset to inherit the containing block alignment.',
      hidden: ({parent}) => !Array.isArray(parent?.items) || parent.items.length === 0,
      options: {
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
          {title: 'Right', value: 'right'},
        ],
        layout: 'radio',
      },
    }),

    defineField({
      name: 'stackOnMobile',
      title: 'Stack on Mobile',
      type: 'boolean',
      description: 'Stack the buttons vertically on smaller screens.',
      initialValue: true,
      hidden: ({parent}) => !Array.isArray(parent?.items) || parent.items.length === 0,
    }),
  ],

  preview: {
    select: {
      items: 'items',
      alignment: 'alignment',
      stackOnMobile: 'stackOnMobile',
    },

    prepare({items, alignment, stackOnMobile}) {
      const count = Array.isArray(items) ? items.length : 0
      const details = [
        alignment ? `Align ${alignment}` : 'Inherit alignment',
        stackOnMobile === false ? 'Inline on mobile' : 'Stack on mobile',
      ]

      return {
        title: `${count} call${count === 1 ? '' : 's'} to action`,
        subtitle: details.join(' • '),
      }
    },
  },
})
