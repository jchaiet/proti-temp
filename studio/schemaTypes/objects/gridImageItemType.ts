import {defineField, defineType} from 'sanity'
import {createAccessibleImageFields} from './accessibleImageFields'

export const gridImageItemType = defineType({
  name: 'gridImageItem',
  title: 'Image',
  type: 'object',

  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',

      options: {
        hotspot: true,
      },

      fields: createAccessibleImageFields('Image'),

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      description: 'Optional link for the image.',
    }),
  ],

  preview: {
    select: {
      media: 'image',
      alt: 'image.alt',
      linkType: 'link.type',
    },

    prepare({media, alt, linkType}) {
      return {
        title: alt || 'Grid Image',
        subtitle: linkType && linkType !== 'none' ? `Image · ${linkType} link` : 'Image',
        media,
      }
    },
  },
})
