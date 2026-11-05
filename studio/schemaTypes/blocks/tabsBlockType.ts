import {defineArrayMember, defineField, defineType} from 'sanity'
import {portableTextToPlainText} from '../../lib/portableText'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'

type TabsItemValue = {
  defaultActive?: boolean
}

export const tabsBlockType = defineType({
  name: 'tabsBlock',
  title: 'Tabs',
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
      name: 'items',
      title: 'Tabs',
      type: 'array',

      of: [
        defineArrayMember({
          name: 'tabsItem',
          title: 'Tab',
          type: 'object',

          fields: [
            defineField({
              name: 'label',
              title: 'Tab Label',
              type: 'string',

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'badge',
              title: 'Badge',
              type: 'string',

              description: 'Optional short badge or counter shown beside the tab label.',
            }),

            defineField({
              name: 'defaultActive',
              title: 'Open by Default',

              type: 'boolean',

              initialValue: false,

              description: 'Use this tab as the initially active tab.',
            }),

            defineField({
              name: 'content',
              title: 'Content',
              type: 'richText',
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
            }),

            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',

              options: {
                hotspot: true,
              },

              hidden: ({parent}) => parent?.mediaType !== 'image',

              fields: createAccessibleImageFields('Image'),
            }),

            defineField({
              name: 'videoUrl',
              title: 'Video URL',

              type: 'url',

              hidden: ({parent}) => parent?.mediaType !== 'video',

              validation: (Rule) =>
                Rule.uri({
                  scheme: ['http', 'https'],
                }),
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
          ],

          preview: {
            select: {
              title: 'label',

              badge: 'badge',

              media: 'image',

              defaultActive: 'defaultActive',
            },

            prepare({title, badge, media, defaultActive}) {
              const details = [
                defaultActive ? 'Default' : undefined,

                badge ? `Badge: ${badge}` : undefined,
              ]
                .filter(Boolean)
                .join(' · ')

              return {
                title: title || 'Untitled Tab',

                subtitle: details || undefined,

                media,
              }
            },
          },
        }),
      ],

      validation: (Rule) =>
        Rule.min(1)
          .error('Tabs must contain at least one tab.')
          .custom((value) => {
            const items = value as TabsItemValue[] | undefined

            const count = items?.filter((item) => item?.defaultActive === true).length ?? 0

            if (count > 1) {
              return 'Only one tab can be open by default.'
            }

            return true
          }),
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
    },

    prepare({title, items}) {
      const headingTitle = portableTextToPlainText(title)

      const count = Array.isArray(items) ? items.length : 0

      return {
        title: headingTitle || 'Tabs',

        subtitle: `${count} tab${count === 1 ? '' : 's'}`,
      }
    },
  },
})
