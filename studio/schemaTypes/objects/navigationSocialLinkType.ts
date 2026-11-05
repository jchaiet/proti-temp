import {defineField, defineType} from 'sanity'

import {validateRequiredLink} from '../validation/linkDestination'

export const navigationSocialLinkType = defineType({
  name: 'navigationSocialLink',
  title: 'Social Link',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Accessible Label',
      type: 'string',
      validation: (rule) => rule.required().max(80),
    }),

    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'iconPicker',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      validation: (rule) => rule.required().custom((value) => validateRequiredLink(value)),
    }),
  ],

  preview: {
    select: {
      title: 'label',
    },

    prepare({title}) {
      return {
        title: title ?? 'Social Link',
      }
    },
  },
})
