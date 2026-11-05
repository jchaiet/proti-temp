import {defineArrayMember, defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {SingletonKeyInput} from '../../components/inputs/SingletonKeyInput'
import {validateSingletonHeadingQuality} from '../validation/headingQuality'
import {validateSiteLocale} from '../validation/siteLocale'
import {validateSingletonKey} from '../validation/singletonKey'

const singletonComponentMembers = [
  defineArrayMember({type: 'heroBlock'}),
  defineArrayMember({type: 'carouselBlock'}),
  defineArrayMember({type: 'accordionBlock'}),
  defineArrayMember({type: 'contentBlock'}),
  defineArrayMember({type: 'tabsBlock'}),
  defineArrayMember({type: 'formBlock'}),
  defineArrayMember({type: 'gridBlock'}),
  defineArrayMember({type: 'documentListBlock'}),
  defineArrayMember({type: 'richTextBlock'}),
  defineArrayMember({type: 'pollBlock'}),
]

const COMPONENT_LABELS: Record<string, string> = {
  accordionBlock: 'Accordion',
  carouselBlock: 'Carousel',
  contentBlock: 'Content Block',
  documentListBlock: 'Document List',
  formBlock: 'Form',
  gridBlock: 'Grid',
  heroBlock: 'Hero',
  pollBlock: 'Poll',
  richTextBlock: 'Rich Text',
  tabsBlock: 'Tabs',
}

export const singletonType = defineType({
  name: 'singleton',
  title: 'Singleton',
  type: 'document',

  groups: [
    {
      name: 'content',
      title: 'Content',
      default: true,
    },
    {
      name: 'assignment',
      title: 'Site & Locale',
    },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Singleton Name',
      type: 'string',
      group: 'content',
      description:
        'Internal name used by editors, for example Global CTA or Featured Diabetes Articles.',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'key',
      title: 'Key',
      type: 'string',
      group: 'content',
      description:
        'Stable identity shared across translations, for example global-cta or featured-diabetes-articles. Generate it from the Singleton Name when first creating the Singleton, then keep it stable across translations.',
      components: {
        input: SingletonKeyInput,
      },
      validation: (rule) =>
        rule.required().custom((key, context) => validateSingletonKey(key, context)),
    }),

    defineField({
      name: 'component',
      title: 'Component',
      type: 'array',
      group: 'content',
      description:
        'Choose exactly one existing Proti component. The same component instance can then be inserted on any compatible Page or Blog.',
      of: singletonComponentMembers,
      validation: (rule) => [
        rule.required().min(1).max(1),
        rule.custom((component) => validateSingletonHeadingQuality(component)).warning(),
      ],
    }),

    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'assignment',
      description: 'Website this Singleton belongs to.',
      to: [{type: 'site'}],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      group: 'assignment',
      description: 'Regional language version of this Singleton.',
      components: {
        input: PageLocaleInput,
      },
      validation: (rule) =>
        rule.required().custom((locale, context) => validateSiteLocale(locale, context)),
    }),
  ],

  orderings: [
    {
      title: 'Name',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],

  preview: {
    select: {
      title: 'title',
      key: 'key',
      site: 'site.name',
      locale: 'locale',
      componentType: 'component.0._type',
    },

    prepare({title, key, site, locale, componentType}) {
      const componentLabel = COMPONENT_LABELS[componentType] ?? componentType

      return {
        title: title || 'Untitled Singleton',
        subtitle: [site, locale, componentLabel, key].filter(Boolean).join(' • '),
      }
    },
  },
})
