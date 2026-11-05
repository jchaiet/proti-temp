import {defineArrayMember, defineField, defineType} from 'sanity'

import {validateNavigationItemDestination} from '../validation/linkDestination'

export const navigationItemType = defineType({
  name: 'navigationItem',
  title: 'Navigation Item',
  type: 'object',

  fields: [
    defineField({
      name: 'mode',
      title: 'Navigation Type',
      type: 'string',
      description:
        'Choose Link, Dropdown, or Mega Menu for this top-level Header item. Existing items without a type keep their original behavior.',
      initialValue: 'link',
      options: {
        layout: 'radio',
        list: [
          {title: 'Link', value: 'link'},
          {title: 'Dropdown', value: 'dropdown'},
          {title: 'Mega Menu', value: 'mega'},
        ],
      },
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      hidden: ({parent}) => parent?.mode === 'dropdown' || parent?.mode === 'mega',
      description:
        'Optional when this item only opens a dropdown. Required for a normal top-level link.',
    }),

    defineField({
      name: 'badge',
      title: 'Badge',
      type: 'string',
      description: 'Optional short label such as New or Beta.',
      validation: (rule) => rule.max(40),
    }),

    defineField({
      name: 'children',
      title: 'Dropdown Items',
      type: 'array',
      hidden: ({parent}) => parent?.mode === 'link' || parent?.mode === 'mega',
      description: 'Optional one-level dropdown. This mirrors the mino Navigation component.',
      of: [
        defineArrayMember({
          type: 'navigationSubItem',
        }),
      ],
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(12)),
    }),

    defineField({
      name: 'megaMenu',
      title: 'Mega Menu Configuration',
      type: 'navigationMegaMenu',
      description:
        'Configure the open panel using Sections. Choose Mixed Content to add individual Links, Tiles, or Cards, or use Featured Card for a side promotion.',
      hidden: ({parent}) => parent?.mode !== 'mega',
    }),
  ],

  validation: (rule) => rule.custom((value) => validateNavigationItemDestination(value)),

  preview: {
    select: {
      title: 'label',
      badge: 'badge',
      mode: 'mode',
      megaMenu: 'megaMenu',
      children: 'children',
    },

    prepare({title, badge, mode, megaMenu, children}) {
      const count = Array.isArray(children) ? children.length : 0

      return {
        title: title ?? 'Untitled Navigation Item',
        subtitle: [
          mode === 'mega'
            ? `Mega Menu (${Array.isArray(megaMenu?.sections) ? megaMenu.sections.length : 0} sections)`
            : count > 0
              ? `${count} dropdown item${count === 1 ? '' : 's'}`
              : 'Top-level link',
          badge ? `Badge: ${badge}` : undefined,
        ]
          .filter(Boolean)
          .join(' • '),
      }
    },
  },
})
