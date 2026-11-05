import {defineArrayMember, defineField, defineType} from 'sanity'
import {portableTextToPlainText} from '../../lib/portableText'

export const accordionBlockType = defineType({
  name: 'accordionBlock',
  title: 'Accordion',
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
      name: 'accordionPosition',
      title: 'Accordion Position',
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
      title: 'Accordion Items',
      type: 'array',

      of: [
        defineArrayMember({
          name: 'accordionItem',
          title: 'Accordion Item',
          type: 'object',

          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'content',
              title: 'Content',
              type: 'text',

              rows: 5,

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'defaultOpen',
              title: 'Open by Default',
              type: 'boolean',

              initialValue: false,

              description: 'Open this item when the accordion first loads.',
            }),
          ],

          preview: {
            select: {
              title: 'title',
              content: 'content',
              defaultOpen: 'defaultOpen',
            },

            prepare({title, content, defaultOpen}) {
              return {
                title: title || 'Untitled item',

                subtitle: defaultOpen ? 'Open by default' : content,
              }
            },
          },
        }),
      ],

      validation: (Rule) =>
        Rule.min(1).warning('An accordion should normally contain at least one item.'),
    }),

    defineField({
      name: 'multiple',
      title: 'Allow Multiple Items Open',

      type: 'boolean',

      initialValue: true,

      description:
        'When enabled, visitors can expand more than one accordion item at the same time.',
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
        title: headingTitle || 'Accordion',

        subtitle: `${count} item${count === 1 ? '' : 's'}`,
      }
    },
  },
})
