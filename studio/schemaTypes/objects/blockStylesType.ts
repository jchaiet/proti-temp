import {defineField, defineType} from 'sanity'

export const blockStylesType = defineType({
  name: 'blockStyles',
  title: 'Block Styles',
  type: 'object',

  fields: [
    defineField({
      name: 'verticalPadding',
      title: 'Vertical Padding',
      type: 'string',

      description:
        "Overrides the block default top and bottom padding. Default preserves the component's built-in spacing.",

      initialValue: 'default',

      options: {
        list: [
          {title: 'Default', value: 'default'},
          {title: 'None', value: 'none'},
          {title: 'Small', value: 'sm'},
          {title: 'Medium', value: 'md'},
          {title: 'Large', value: 'lg'},
          {title: 'XL', value: 'xl'},
          {title: '2XL', value: '2xl'},
          {title: '3XL', value: '3xl'},
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'background',
      title: 'Background',
      type: 'string',

      description:
        'Applies a full-width semantic background to the block. Colors come from the Mino theme rather than authored hex values.',

      initialValue: 'default',

      options: {
        list: [
          {title: 'Default', value: 'default'},
          {title: 'Canvas', value: 'canvas'},
          {title: 'Surface', value: 'surface'},
          {title: 'Brand Subtle', value: 'brand-muted'},
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'contentWidth',
      title: 'Content Width',
      type: 'string',

      description:
        "Overrides the maximum inner content width for the block. Default preserves the component's built-in width.",

      initialValue: 'default',

      options: {
        list: [
          {title: 'Default', value: 'default'},
          {title: 'Narrow', value: 'narrow'},
          {title: 'Standard', value: 'standard'},
          {title: 'Wide', value: 'wide'},
          {title: 'Full Width', value: 'full'},
        ],

        layout: 'radio',
      },
    }),
  ],
})
