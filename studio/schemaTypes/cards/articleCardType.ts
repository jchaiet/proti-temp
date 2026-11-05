import {defineField, defineType} from 'sanity'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const articleCardType = defineType({
  name: 'articleCard',
  title: 'Article Card',
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
      title: 'Link',
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
      name: 'category',
      title: 'Category',
      type: 'string',
    }),

    defineField({
      name: 'publishedAt',
      title: 'Published Date',
      type: 'date',
    }),

    defineField({
      name: 'readTime',
      title: 'Read Time',
      type: 'string',

      description: 'For example "5 min read".',
    }),

    defineField({
      name: 'author',
      title: 'Author',
      type: 'object',

      fields: [
        defineField({
          name: 'name',
          title: 'Name',
          type: 'string',

          validation: (Rule) => Rule.required(),
        }),

        defineField({
          name: 'role',
          title: 'Role',
          type: 'string',
        }),

        defineField({
          name: 'avatar',
          title: 'Avatar',
          type: 'image',

          fields: createAccessibleImageFields('Image'),

          options: {
            hotspot: true,
          },
        }),
      ],
    }),

    defineField({
      name: 'orientation',
      title: 'Orientation',
      type: 'string',

      initialValue: 'vertical',

      options: {
        list: [
          {
            title: 'Vertical',
            value: 'vertical',
          },
          {
            title: 'Horizontal',
            value: 'horizontal',
          },
        ],

        layout: 'radio',
      },
    }),
  ],

  preview: {
    select: {
      title: 'title',
      subtitle: 'category',
      media: 'image',
    },
  },
})
