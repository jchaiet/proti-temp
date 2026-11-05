import {defineArrayMember, defineField, defineType} from 'sanity'

import {createAccessibleImageFields} from './accessibleImageFields'
import {validateRequiredLink} from '../validation/linkDestination'
import {validateNavigationMegaLayout} from '../validation/navigationMega'

const spans = [1, 2, 3, 4].map((value) => ({title: String(value), value}))
const tones = [
  {title: 'Surface', value: 'surface'},
  {title: 'Muted', value: 'muted'},
  {title: 'Accent', value: 'accent'},
]

const sectionSpan = () =>
  defineField({
    name: 'span',
    title: 'Outer Grid Column Span',
    type: 'number',
    description: 'Columns occupied by this section in the Mega Menu outer grid (default: 1).',
    initialValue: 1,
    options: {list: spans},
    validation: (rule, context) => (context?.hidden ? rule.skip() : rule.integer().min(1).max(4)),
  })

const illustrationField = () =>
  defineField({
    name: 'illustration',
    title: 'Illustration',
    type: 'image',
    description: 'Bottom illustration for Tile display; top cover image for Card display.',
    options: {hotspot: true},
    fields: createAccessibleImageFields('Illustration'),
  })

export const navigationMegaTileType = defineType({
  name: 'navigationMegaTile',
  title: 'Mega Menu Tile',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.required().max(120)),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(240)),
    }),
    defineField({
      name: 'link',
      title: 'Destination',
      type: 'link',
      validation: (rule, context) =>
        context?.hidden
          ? rule.skip()
          : rule.required().custom((value) => validateRequiredLink(value)),
    }),
    defineField({
      name: 'tone',
      title: 'Background',
      type: 'string',
      initialValue: 'surface',
      options: {list: tones},
    }),
    defineField({
      name: 'span',
      title: 'Tile Column Span',
      type: 'number',
      initialValue: 1,
      options: {list: spans.slice(0, 3)},
      description: 'Span within this tile section (not the outer grid).',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.integer().min(1).max(3)),
    }),
    illustrationField(),
  ],
  preview: {
    select: {title: 'label', subtitle: 'description', media: 'illustration'},
    prepare: ({title, subtitle, media}) => ({title: title ?? 'Untitled Tile', subtitle, media}),
  },
})

export const navigationMegaCardType = defineType({
  name: 'navigationMegaCard',
  title: 'Card (Image / Copy / CTA)',
  type: 'object',
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(80)),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.required().max(120)),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(300)),
    }),
    defineField({
      name: 'link',
      title: 'Destination',
      type: 'link',
      validation: (rule, context) =>
        context?.hidden
          ? rule.skip()
          : rule.required().custom((value) => validateRequiredLink(value)),
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA Label',
      type: 'string',
      initialValue: 'Read more',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(70)),
    }),
    defineField({
      name: 'tone',
      title: 'Background',
      type: 'string',
      initialValue: 'surface',
      options: {list: tones},
    }),
    defineField({
      name: 'span',
      title: 'Column Span',
      type: 'number',
      initialValue: 1,
      options: {list: spans.slice(0, 3)},
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.integer().min(1).max(3)),
    }),
    defineField({
      name: 'image',
      title: 'Card Image',
      type: 'image',
      options: {hotspot: true},
      fields: createAccessibleImageFields('Card Image'),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'description', media: 'image'},
    prepare: ({title, subtitle, media}) => ({title: title ?? 'Untitled Card', subtitle, media}),
  },
})

export const navigationMegaCategoryType = defineType({
  name: 'navigationMegaCategory',
  title: 'Explorer Category',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Category',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.required().max(120)),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(240)),
    }),
    defineField({name: 'icon', title: 'Icon', type: 'iconPicker'}),
    defineField({
      name: 'links',
      title: 'Category Links',
      type: 'array',
      of: [defineArrayMember({type: 'navigationSubItem'})],
      validation: (rule, context) =>
        context?.hidden ? rule.skip() : rule.required().min(1).max(20),
    }),
  ],
  preview: {
    select: {title: 'label', links: 'links'},
    prepare: ({title, links}) => ({
      title: title ?? 'Untitled Category',
      subtitle: `${Array.isArray(links) ? links.length : 0} links`,
    }),
  },
})

export const navigationMegaLinksSectionType = defineType({
  name: 'navigationMegaLinksSection',
  title: 'Link List',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(120)),
    }),
    sectionSpan(),
    defineField({
      name: 'items',
      title: 'Links',
      type: 'array',
      of: [defineArrayMember({type: 'navigationSubItem'})],
      validation: (rule, context) =>
        context?.hidden ? rule.skip() : rule.required().min(1).max(24),
    }),
  ],
  preview: {
    select: {title: 'title', items: 'items'},
    prepare: ({title, items}) => ({
      title: title ?? 'Links',
      subtitle: `${Array.isArray(items) ? items.length : 0} links`,
    }),
  },
})

export const navigationMegaTilesSectionType = defineType({
  name: 'navigationMegaTilesSection',
  title: 'Tiles',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(120)),
    }),
    sectionSpan(),
    defineField({
      name: 'columns',
      title: 'Tile Grid Columns',
      type: 'number',
      initialValue: 2,
      options: {list: [1, 2, 3].map((value) => ({title: String(value), value}))},
      description: 'Number of columns INSIDE this section.',
      validation: (rule, context) =>
        context?.hidden ? rule.skip() : rule.required().integer().min(1).max(3),
    }),
    defineField({
      name: 'items',
      title: 'Tiles',
      type: 'array',
      of: [defineArrayMember({type: 'navigationMegaTile'})],
      validation: (rule, context) =>
        context?.hidden ? rule.skip() : rule.required().min(1).max(16),
    }),
  ],
  preview: {
    select: {title: 'title', items: 'items'},
    prepare: ({title, items}) => ({
      title: title ?? 'Tiles',
      subtitle: `${Array.isArray(items) ? items.length : 0} tiles`,
    }),
  },
})

export const navigationMegaContentSectionType = defineType({
  name: 'navigationMegaContentSection',
  title: 'Mixed Content (Links / Tiles / Cards)',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(120)),
    }),
    sectionSpan(),
    defineField({
      name: 'columns',
      title: 'Content Grid Columns',
      type: 'number',
      initialValue: 2,
      options: {list: [1, 2, 3].map((value) => ({title: String(value), value}))},
      validation: (rule, context) =>
        context?.hidden ? rule.skip() : rule.required().integer().min(1).max(3),
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      description: 'Add a Link, Tile, or Card in any order.',
      of: [
        defineArrayMember({type: 'navigationSubItem', title: 'Link'}),
        defineArrayMember({type: 'navigationMegaTile', title: 'Tile'}),
        defineArrayMember({type: 'navigationMegaCard', title: 'Card'}),
      ],
      validation: (rule, context) =>
        context?.hidden ? rule.skip() : rule.required().min(1).max(16),
    }),
  ],
  preview: {
    select: {title: 'title', items: 'items'},
    prepare: ({title, items}) => ({
      title: title ?? 'Mixed Content',
      subtitle: `${Array.isArray(items) ? items.length : 0} items`,
    }),
  },
})

export const navigationMegaExplorerSectionType = defineType({
  name: 'navigationMegaExplorerSection',
  title: 'Explorer (Interactive Categories)',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(120)),
    }),
    sectionSpan(),
    defineField({
      name: 'items',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({type: 'navigationMegaCategory'})],
      validation: (rule, context) =>
        context?.hidden ? rule.skip() : rule.required().min(1).max(12),
    }),
  ],
  preview: {
    select: {title: 'title', items: 'items'},
    prepare: ({title, items}) => ({
      title: title ?? 'Explorer',
      subtitle: `${Array.isArray(items) ? items.length : 0} categories`,
    }),
  },
})

export const navigationMegaFeatureSectionType = defineType({
  name: 'navigationMegaFeatureSection',
  title: 'Featured Card',
  type: 'object',
  fields: [
    defineField({
      name: 'presentation',
      title: 'Display Style',
      type: 'string',
      initialValue: 'tile',
      description: 'Older featured sections without a style keep their existing appearance.',
      options: {
        layout: 'radio',
        list: [
          {title: 'Tile', value: 'tile'},
          {title: 'Card', value: 'card'},
        ],
      },
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA Label',
      type: 'string',
      initialValue: 'Read more',
      hidden: ({parent}) => parent?.presentation !== 'card',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(70)),
    }),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(80)),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.required().max(120)),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (rule, context) => (context?.hidden ? rule.skip() : rule.max(300)),
    }),
    defineField({
      name: 'link',
      title: 'Optional Card Destination',
      type: 'link',
      description: 'Leave empty for a non-clickable feature card.',
    }),
    defineField({
      name: 'tone',
      title: 'Background',
      type: 'string',
      initialValue: 'accent',
      options: {list: tones},
    }),
    sectionSpan(),
    illustrationField(),
  ],
  preview: {
    select: {title: 'title', subtitle: 'description', media: 'illustration'},
    prepare: ({title, subtitle, media}) => ({title: title ?? 'Featured Card', subtitle, media}),
  },
})

export const navigationMegaMenuType = defineType({
  name: 'navigationMegaMenu',
  title: 'Mega Menu',
  type: 'object',
  fields: [
    defineField({
      name: 'columns',
      title: 'Outer Grid Columns',
      type: 'number',
      initialValue: 4,
      options: {list: [2, 3, 4, 5].map((value) => ({title: String(value), value}))},
      validation: (rule, context) =>
        context?.hidden ? rule.skip() : rule.required().integer().min(2).max(5),
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      description:
        'Drag to reorder. Add link lists, tile grids, mixed content, explorers, or featured sections.',
      type: 'array',
      of: [
        defineArrayMember({type: 'navigationMegaLinksSection'}),
        defineArrayMember({type: 'navigationMegaTilesSection'}),
        defineArrayMember({type: 'navigationMegaContentSection'}),
        defineArrayMember({type: 'navigationMegaExplorerSection'}),
        defineArrayMember({type: 'navigationMegaFeatureSection'}),
      ],
      validation: (rule, context) =>
        context?.hidden ? rule.skip() : rule.required().min(1).max(12),
    }),
  ],
  validation: (rule, context) =>
    context?.hidden ? rule.skip() : rule.custom((value) => validateNavigationMegaLayout(value)),
})
