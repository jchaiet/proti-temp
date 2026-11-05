import {defineField, defineType} from 'sanity'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const testimonialCardType = defineType({
  name: 'testimonialCard',
  title: 'Testimonial Card',
  type: 'object',

  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 4,

      validation: (Rule) => Rule.required(),
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
          name: 'title',
          title: 'Job Title',
          type: 'string',
        }),

        defineField({
          name: 'company',
          title: 'Company',
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

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',

      validation: (Rule) => Rule.integer().min(1).max(5),

      options: {
        list: [
          {title: '1 Star', value: 1},
          {title: '2 Stars', value: 2},
          {title: '3 Stars', value: 3},
          {title: '4 Stars', value: 4},
          {title: '5 Stars', value: 5},
        ],
      },
    }),

    defineField({
      name: 'companyLogo',
      title: 'Company Logo',
      type: 'image',

      fields: createAccessibleImageFields('Image'),

      options: {
        hotspot: false,
      },
    }),
  ],

  preview: {
    select: {
      title: 'author.name',
      company: 'author.company',
      subtitle: 'quote',
      media: 'author.avatar',
    },

    prepare({title, company, subtitle, media}) {
      return {
        title: title || 'Testimonial',

        subtitle: company || subtitle,

        media,
      }
    },
  },
})
