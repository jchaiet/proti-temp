import {defineField, defineType} from 'sanity'

import {siteLocaleReferenceFilter} from '../validation/referenceFilters'
import {validateSingletonReference} from '../validation/singletonReferences'

const BLOCK_LABELS: Record<string, string> = {
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

export const singletonReferenceBlockType = defineType({
  name: 'singletonReferenceBlock',
  title: 'Singleton',
  type: 'object',

  validation: (rule) => rule.custom((value, context) => validateSingletonReference(value, context)),

  fields: [
    defineField({
      name: 'singleton',
      title: 'Singleton',
      type: 'reference',
      description:
        'Reusable component instance. Updating the referenced Singleton updates every Page or Blog that uses it.',
      to: [{type: 'singleton'}],
      options: {
        disableNew: true,
        filter: ({document}) => siteLocaleReferenceFilter(document),
      },
      validation: (rule) => rule.required(),
    }),
  ],

  preview: {
    select: {
      title: 'singleton.title',
      key: 'singleton.key',
      componentType: 'singleton.component.0._type',
    },

    prepare({title, key, componentType}) {
      const componentLabel = BLOCK_LABELS[componentType] ?? componentType ?? 'Component'

      return {
        title: title || 'Untitled Singleton',
        subtitle: [componentLabel, key].filter(Boolean).join(' • '),
      }
    },
  },
})
