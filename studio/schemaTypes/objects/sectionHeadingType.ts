import {defineField, defineType} from 'sanity'

export interface SectionHeadingValue {
  eyebrow?: unknown[]
  title?: unknown[]
  description?: unknown[]
  disclaimer?: unknown[]
  textAlignment?: 'inherit' | 'left' | 'center' | 'right'
}

export const sectionHeadingType = defineType({
  name: 'sectionHeading',
  title: 'Heading',
  type: 'object',

  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'inlineRichText',
    }),

    defineField({
      name: 'title',
      title: 'Title',
      type: 'inlineRichText',

      validation: (rule) =>
        rule
          .custom((value) => {
            if (!Array.isArray(value) || value.length === 0) {
              return true
            }

            const block = value[0] as {style?: string} | undefined
            const style = block?.style

            return style && /^h[1-6]$/.test(style)
              ? true
              : 'Section Title should use Heading 1 through Heading 6 rather than Normal text.'
          })
          .warning(),
    }),

    defineField({
      name: 'textAlignment',
      title: 'Text Alignment',
      type: 'string',

      description:
        'Controls the alignment of the heading text only. Block placement alignment remains separate.',

      initialValue: 'inherit',

      options: {
        list: [
          {title: 'Block Default', value: 'inherit'},
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
          {title: 'Right', value: 'right'},
        ],
        layout: 'radio',
      },
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'richText',
    }),

    defineField({
      name: 'disclaimer',
      title: 'Disclaimer',
      type: 'inlineRichText',
    }),
  ],
})
