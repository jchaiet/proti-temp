import {defineArrayMember, defineField, defineType} from 'sanity'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const resourceCardType = defineType({
  name: 'resourceCard',
  title: 'Resource Card',
  type: 'object',

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
    }),

    defineField({
      name: 'link',
      title: 'Resource Link',
      type: 'link',
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',

      options: {
        hotspot: true,
      },

      fields: createAccessibleImageFields('Image'),
    }),

    defineField({
      name: 'fileType',
      title: 'File Type',
      type: 'string',

      description: 'For example PDF, ZIP or DOCX.',
    }),

    defineField({
      name: 'fileSize',
      title: 'File Size',
      type: 'string',

      description: 'For example "4.2 MB".',
    }),

    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',

      of: [
        defineArrayMember({
          type: 'string',
        }),
      ],

      options: {
        layout: 'tags',
      },
    }),

    defineField({
      name: 'actionLabel',
      title: 'Action Label',
      type: 'string',
      initialValue: 'Download',
    }),
  ],

  preview: {
    select: {
      title: 'title',
      subtitle: 'fileType',
      media: 'image',
    },
  },
})
