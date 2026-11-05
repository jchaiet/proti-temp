import {defineArrayMember, defineField, defineType} from 'sanity'

export const footerColumnType = defineType({
  name: 'footerColumn',
  title: 'Footer Column',
  type: 'object',

  fields: [
    defineField({
      name: 'title',
      title: 'Column Title',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'footerLink',
        }),
      ],
    }),
  ],

  preview: {
    select: {
      title: 'title',
      links: 'links',
    },

    prepare({title, links}) {
      const count = Array.isArray(links) ? links.length : 0

      return {
        title: title ?? 'Untitled Footer Column',
        subtitle: `${count} link${count === 1 ? '' : 's'}`,
      }
    },
  },
})
