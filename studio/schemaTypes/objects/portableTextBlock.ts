import TextIcon from '@sanity/icons/Text'

import {defineArrayMember, defineField} from 'sanity'

export type PortableTextBlockOptions = {
  allowLists?: boolean

  allowBlockquote?: boolean

  allowLinks?: boolean
}

const TEXT_COLOR_OPTIONS = [
  {
    title: 'Default',
    value: 'default',
  },
  {
    title: 'Brand',
    value: 'brand',
  },
  {
    title: 'Secondary',
    value: 'secondary',
  },
  {
    title: 'Inverse',
    value: 'inverse',
  },
]

const TEXT_SIZE_OPTIONS = [
  {
    title: 'Inherit',
    value: 'inherit',
  },
  {
    title: 'Small',
    value: 'sm',
  },
  {
    title: 'Medium',
    value: 'md',
  },
  {
    title: 'Large',
    value: 'lg',
  },
  {
    title: 'XL',
    value: 'xl',
  },
  {
    title: '2XL',
    value: '2xl',
  },
  {
    title: '3XL',
    value: '3xl',
  },
  {
    title: '4XL',
    value: '4xl',
  },
]

const HEADING_STYLES = [
  {
    title: 'Normal',
    value: 'normal',
  },
  {
    title: 'Heading 1',
    value: 'h1',
  },
  {
    title: 'Heading 2',
    value: 'h2',
  },
  {
    title: 'Heading 3',
    value: 'h3',
  },
  {
    title: 'Heading 4',
    value: 'h4',
  },
  {
    title: 'Heading 5',
    value: 'h5',
  },
  {
    title: 'Heading 6',
    value: 'h6',
  },
]

/*
 * Define custom Portable Text annotations with defineArrayMember().
 *
 * This is important for Sanity's TypeScript inference. Raw object
 * literals inside a conditional spread can be inferred as a generic
 * type alias, which then rejects object-specific properties such as
 * `fields`.
 */
const TEXT_STYLE_ANNOTATION = defineArrayMember({
  name: 'textStyle',
  title: 'Text Style',
  icon: TextIcon,
  type: 'object',

  fields: [
    defineField({
      name: 'color',
      title: 'Color',
      type: 'string',

      initialValue: 'default',

      options: {
        list: TEXT_COLOR_OPTIONS,
      },
    }),

    defineField({
      name: 'size',
      title: 'Text Size',
      type: 'string',

      initialValue: 'inherit',

      options: {
        list: TEXT_SIZE_OPTIONS,
      },
    }),
  ],
})

const LINK_ANNOTATION = defineArrayMember({
  name: 'link',
  title: 'Link',
  type: 'object',

  fields: [
    defineField({
      name: 'href',
      title: 'URL',
      type: 'url',

      validation: (rule) =>
        rule.required().uri({
          scheme: ['http', 'https', 'mailto', 'tel'],
        }),
    }),

    defineField({
      name: 'openInNewTab',
      title: 'Open in New Tab',
      type: 'boolean',

      initialValue: false,
    }),
  ],
})

export function createPortableTextBlock({
  allowLists = true,

  allowBlockquote = true,

  allowLinks = true,
}: PortableTextBlockOptions = {}) {
  return defineArrayMember({
    type: 'block',

    styles: [
      ...HEADING_STYLES,

      ...(allowBlockquote
        ? [
            {
              title: 'Blockquote',
              value: 'blockquote',
            },
          ]
        : []),
    ],

    lists: allowLists
      ? [
          {
            title: 'Bullet',
            value: 'bullet',
          },

          {
            title: 'Numbered',
            value: 'number',
          },
        ]
      : [],

    marks: {
      decorators: [
        {
          title: 'Bold',
          value: 'strong',
        },

        {
          title: 'Italic',
          value: 'em',
        },
      ],

      annotations: allowLinks ? [TEXT_STYLE_ANNOTATION, LINK_ANNOTATION] : [TEXT_STYLE_ANNOTATION],
    },
  })
}
