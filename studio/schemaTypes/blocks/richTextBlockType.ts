import {defineField, defineType} from 'sanity'

import {portableTextToPlainText} from '../../lib/portableText'

export const richTextBlockType = defineType({
  name: 'richTextBlock',
  title: 'Rich Text',
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
      name: 'content',
      title: 'Content',
      type: 'richText',

      description:
        'Long-form rich text content. Use separate Page Builder blocks for richer layouts and interactive content.',

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'alignment',
      title: 'Heading Alignment',
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

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'maxWidth',
      title: 'Content Width',
      type: 'string',

      description:
        'Controls the Rich Text reading width when Styles → Content Width is left as Default.',

      initialValue: 'md',

      options: {
        list: [
          {
            title: 'Small — 640px',
            value: 'sm',
          },
          {
            title: 'Medium — 800px',
            value: 'md',
          },
          {
            title: 'Large — 1024px',
            value: 'lg',
          },
          {
            title: 'Full Width',
            value: 'full',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
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

      content: 'content',

      maxWidth: 'maxWidth',
    },

    prepare({title, content, maxWidth}) {
      const headingTitle = portableTextToPlainText(title)

      const contentPreview = portableTextToPlainText(content)

      return {
        title: headingTitle || contentPreview.slice(0, 80) || 'Rich Text',

        subtitle: `Rich Text · ${maxWidth ?? 'md'} width`,
      }
    },
  },
})
