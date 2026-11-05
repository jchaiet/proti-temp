import {defineField, defineType} from 'sanity'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const fullBleedCardType = defineType({
  name: 'fullBleedCard',
  title: 'Full Bleed Card',
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
      name: 'title',
      title: 'Title',
      type: 'string',

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',

      rows: 3,

      description: 'Revealed when the card is hovered or focused.',
    }),

    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',

      description: 'Optional link for the entire card.',
    }),

    defineField({
      name: 'expandable',
      title: 'Expand on Hover',
      type: 'boolean',

      description:
        'When enabled, this card can grow within a group of Full Bleed Cards when hovered or focused.',

      initialValue: false,
    }),
  ],

  preview: {
    select: {
      title: 'title',
      media: 'image',
      expandable: 'expandable',
      linkType: 'link.type',
    },

    prepare({title, media, expandable, linkType}) {
      const details = [
        expandable ? 'Expandable' : undefined,
        linkType && linkType !== 'none' ? 'Linked' : undefined,
      ].filter(Boolean)

      return {
        title: title || 'Full Bleed Card',
        subtitle: details.length ? details.join(' · ') : 'Full Bleed Card',
        media,
      }
    },
  },
})
