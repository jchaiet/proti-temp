import {defineField, defineType} from 'sanity'

import {validateRequiredLink} from '../validation/linkDestination'

export const footerLinkType = defineType({
  name: 'footerLink',
  title: 'Footer Link',
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
      badge: 'badge',
    },

    prepare({title, badge}) {
      return {
        title: title ?? 'Untitled Footer Link',
        subtitle: badge ? `Badge: ${badge}` : 'Footer Link',
      }
    },
  },
})
