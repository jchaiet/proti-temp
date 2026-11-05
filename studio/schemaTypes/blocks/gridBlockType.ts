import {defineArrayMember, defineField, defineType} from 'sanity'
import {portableTextToPlainText} from '../../lib/portableText'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const gridBlockType = defineType({
  name: 'gridBlock',
  title: 'Grid',
  type: 'object',

  groups: [
    {
      name: 'styles',
      title: 'Styles',
    },
  ],

  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'sectionHeading',
    }),

    defineField({
      name: 'blockLayout',
      title: 'Layout',
      type: 'string',

      initialValue: 'stacked',

      options: {
        list: [
          {
            title: 'Stacked',
            value: 'stacked',
          },
          {
            title: 'Split',
            value: 'split',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'alignment',
      title: 'Content Alignment',
      type: 'string',

      initialValue: 'left',

      options: {
        list: [
          {
            title: 'Left',
            value: 'left',
          },
          {
            title: 'Center',
            value: 'center',
          },
          {
            title: 'Right',
            value: 'right',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'gridPosition',
      title: 'Grid Position',
      type: 'string',

      description:
        'For split layouts, controls which side contains the grid. For stacked layouts with side media, controls the grid/media position.',

      initialValue: 'right',

      options: {
        list: [
          {
            title: 'Left',
            value: 'left',
          },
          {
            title: 'Right',
            value: 'right',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'cols',
      title: 'Desktop Columns',
      type: 'number',

      description:
        'Number of columns used on desktop. The grid automatically stacks to one column on mobile and uses up to two columns on tablet.',

      initialValue: 3,

      validation: (Rule) => Rule.required().integer().min(1).max(12),
    }),

    defineField({
      name: 'items',
      title: 'Grid Items',
      type: 'array',

      of: [
        defineArrayMember({
          type: 'gridImageItem',
        }),

        defineArrayMember({
          type: 'articleCard',
        }),

        defineArrayMember({
          type: 'resourceCard',
        }),

        defineArrayMember({
          type: 'testimonialCard',
        }),

        defineArrayMember({
          type: 'fullBleedCard',
        }),
      ],

      validation: (Rule) => Rule.required().min(1),
    }),

    defineField({
      name: 'grayscaleImages',
      title: 'Grayscale Images',
      type: 'boolean',

      description: 'Display standalone grid images in grayscale until hovered.',

      initialValue: false,
    }),

    defineField({
      name: 'sideImage',
      title: 'Side Image',
      type: 'image',

      description: 'Optional supplementary image displayed beside the grid in the stacked layout.',

      hidden: ({parent}) => parent?.blockLayout === 'split',

      options: {
        hotspot: true,
      },

      fields: createAccessibleImageFields('Image'),
    }),

    defineField({
      name: 'styles',
      title: 'Block Styles',
      type: 'blockStyles',
      group: 'styles',

      description:
        'Optional shared presentation overrides for spacing, background, and content width.',
    }),
  ],

  preview: {
    select: {
      title: 'heading.title',
      items: 'items',
      layout: 'blockLayout',
    },

    prepare({title, items, layout}) {
      const headingTitle = portableTextToPlainText(title)

      const count = Array.isArray(items) ? items.length : 0

      return {
        title: headingTitle || 'Grid',

        subtitle: `${layout === 'split' ? 'Split' : 'Stacked'} · ${count} item${
          count === 1 ? '' : 's'
        }`,
      }
    },
  },
})
