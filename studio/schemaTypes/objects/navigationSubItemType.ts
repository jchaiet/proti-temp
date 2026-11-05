import {defineField, defineType} from 'sanity'

import {validateRequiredLink} from '../validation/linkDestination'

export const navigationSubItemType = defineType({
  name: 'navigationSubItem',
  title: 'Navigation Sub Item',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      validation: (rule) => rule.required().custom((value) => validateRequiredLink(value)),
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.max(240),
    }),

    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'iconPicker',
    }),

    defineField({
      name: 'badge',
      title: 'Badge',
      type: 'string',
      description: 'Optional short label such as New or Beta.',
      validation: (rule) => rule.max(40),
    }),
  ],

  preview: {
    select: {
      title: 'label',
      description: 'description',
      badge: 'badge',
    },

    prepare({title, description, badge}) {
      return {
        title: title ?? 'Untitled Navigation Item',
        subtitle: [description, badge ? `Badge: ${badge}` : undefined].filter(Boolean).join(' • '),
      }
    },
  },
})
