import {defineArrayMember, defineField, defineType} from 'sanity'
import type {SectionHeadingValue} from '../objects/sectionHeadingType'
import {portableTextToPlainText} from '../../lib/portableText'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

export const heroBlockType = defineType({
  name: 'heroBlock',
  title: 'Hero',
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

      validation: (Rule) =>
        Rule.required().custom((value) => {
          const heading = value as SectionHeadingValue | undefined

          const title = portableTextToPlainText(heading?.title)

          if (!title) {
            return 'Hero title is required'
          }

          return true
        }),
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
            title: 'Split',
            value: 'split',
          },
          {
            title: 'Split 35 / 65',
            value: 'split-35-65',
          },
          {
            title: 'Tile',
            value: 'tile',
          },
          {
            title: 'Full Bleed',
            value: 'full-bleed',
          },
          {
            title: 'Blog',
            value: 'blog',
          },
        ],
        layout: 'dropdown',
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'hAlignment',
      title: 'Horizontal Alignment',
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

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'vAlignment',
      title: 'Vertical Alignment',
      type: 'string',
      initialValue: 'center',

      options: {
        list: [
          {
            title: 'Top',
            value: 'top',
          },
          {
            title: 'Center',
            value: 'center',
          },
          {
            title: 'Bottom',
            value: 'bottom',
          },
        ],
        layout: 'radio',
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'mediaType',
      title: 'Media',
      type: 'string',
      initialValue: 'none',

      options: {
        list: [
          {
            title: 'None',
            value: 'none',
          },
          {
            title: 'Image',
            value: 'image',
          },
          {
            title: 'Video',
            value: 'video',
          },
        ],
        layout: 'radio',
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',

      options: {
        hotspot: true,
      },

      fields: createAccessibleImageFields('Image'),

      hidden: ({parent}) => parent?.mediaType !== 'image',

      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as
            | {
                mediaType?: string
              }
            | undefined

          if (parent?.mediaType === 'image' && !value) {
            return 'Select an image.'
          }

          return true
        }),
    }),

    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      description: 'Direct URL to a video file that can be used by the Hero video element.',

      hidden: ({parent}) => parent?.mediaType !== 'video',

      validation: (rule) =>
        rule
          .uri({
            scheme: ['http', 'https'],
          })
          .custom((value, context) => {
            const parent = context.parent as
              | {
                  mediaType?: string
                }
              | undefined

            if (parent?.mediaType === 'video' && !value) {
              return 'Enter a video URL.'
            }

            return true
          }),
    }),

    defineField({
      name: 'defaultMediaPosition',
      title: 'Media Position',
      type: 'string',
      initialValue: 'below',

      options: {
        list: [
          {
            title: 'Above Content',
            value: 'above',
          },
          {
            title: 'Below Content',
            value: 'below',
          },
        ],
        layout: 'radio',
      },

      hidden: ({parent}) => (parent?.layout ?? 'default') !== 'default',
    }),

    defineField({
      name: 'splitMediaPosition',
      title: 'Media Position',
      type: 'string',
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

      hidden: ({parent}) => parent?.layout !== 'split' && parent?.layout !== 'split-35-65',
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
      media: 'image',
    },

    prepare({title, media}) {
      const headingTitle = portableTextToPlainText(title)

      return {
        title: headingTitle || 'Untitled Hero',

        subtitle: 'Hero',

        media,
      }
    },
  },
})
