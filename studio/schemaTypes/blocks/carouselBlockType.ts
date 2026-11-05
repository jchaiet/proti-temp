import {defineArrayMember, defineField, defineType} from 'sanity'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const carouselBlockType = defineType({
  name: 'carouselBlock',
  title: 'Carousel',
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
      name: 'layout',
      title: 'Layout',
      type: 'string',
      initialValue: 'default',
      options: {
        list: [
          {
            title: 'Default',
            value: 'default',
          },
          {
            title: 'Split 50 / 50',
            value: 'split',
          },
          {
            title: 'Split 35 / 65',
            value: 'split-35-65',
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
      name: 'mediaPosition',
      title: 'Carousel Position',
      type: 'string',
      initialValue: 'right',

      hidden: ({parent}) => !parent || parent.layout === 'default',

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
      name: 'ctaGroup',
      title: 'Calls to Action',
      type: 'ctaGroup',
    }),

    // Legacy fields retained temporarily so existing documents remain schema-valid.
    defineField({
      name: 'ctas',
      title: 'Legacy Calls to Action',
      type: 'array',
      hidden: true,
      of: [defineArrayMember({type: 'cta'})],
    }),

    defineField({
      name: 'ctaAlignment',
      title: 'Legacy CTA Alignment',
      type: 'string',
      hidden: true,
    }),

    defineField({
      name: 'ctaStackOnMobile',
      title: 'Legacy CTA Stack on Mobile',
      type: 'boolean',
      hidden: true,
    }),

    defineField({
      name: 'items',
      title: 'Carousel Items',
      type: 'array',

      of: [
        defineArrayMember({
          name: 'carouselImageItem',
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
              description: 'Optional destination when the image is selected.',
            }),
          ],

          preview: {
            select: {
              title: 'image.alt',
              media: 'image',
            },

            prepare({title, media}) {
              return {
                title: title || 'Carousel image',
                media,
              }
            },
          },
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

      validation: (Rule) =>
        Rule.min(1).warning('A carousel should normally contain at least one item.'),
    }),

    defineField({
      name: 'itemsPerPage',
      title: 'Items Per Page',
      type: 'number',
      initialValue: 3,

      options: {
        list: [
          {title: '1', value: 1},
          {title: '2', value: 2},
          {title: '3', value: 3},
          {title: '4', value: 4},
          {title: '5', value: 5},
          {title: '6', value: 6},
        ],
      },

      validation: (Rule) => Rule.required().integer().min(1).max(6),
    }),

    defineField({
      name: 'itemsPerRow',
      title: 'Items Per Row',
      type: 'number',

      description: 'Leave empty to use Items Per Page.',

      options: {
        list: [
          {title: '1', value: 1},
          {title: '2', value: 2},
          {title: '3', value: 3},
          {title: '4', value: 4},
          {title: '5', value: 5},
          {title: '6', value: 6},
        ],
      },

      validation: (Rule) => Rule.integer().min(1).max(6),
    }),

    defineField({
      name: 'autoPlay',
      title: 'Autoplay',
      type: 'boolean',
      initialValue: false,
    }),

    defineField({
      name: 'autoPlayInterval',
      title: 'Autoplay Interval',
      type: 'number',

      description: 'Time between transitions, in milliseconds.',

      initialValue: 4000,

      hidden: ({parent}) => !parent?.autoPlay,

      validation: (Rule) => Rule.integer().min(1000),
    }),

    defineField({
      name: 'mobilePeek',
      title: 'Mobile Peek',
      type: 'boolean',

      description: 'Show a partial preview of neighboring carousel content on mobile.',

      initialValue: true,
    }),

    defineField({
      name: 'grayscaleImages',
      title: 'Grayscale Images',
      type: 'boolean',

      description: 'Render images in grayscale until hover.',

      initialValue: false,
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
      title: 'title',
      layout: 'layout',
      items: 'items',
    },

    prepare({title, layout, items}) {
      const count = Array.isArray(items) ? items.length : 0

      return {
        title: title || 'Carousel',
        subtitle: `${layout || 'default'} · ${count} item${count === 1 ? '' : 's'}`,
      }
    },
  },
})
