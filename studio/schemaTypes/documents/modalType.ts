import {defineArrayMember, defineField, defineType} from 'sanity'

import {ModalKeyInput} from '../../components/inputs/ModalKeyInput'
import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {validateModalKey} from '../validation/modalKey'
import {validateSiteLocale} from '../validation/siteLocale'

const modalContentMembers = [
  defineArrayMember({type: 'contentBlock'}),
  defineArrayMember({type: 'richTextBlock'}),
  defineArrayMember({type: 'accordionBlock'}),
  defineArrayMember({type: 'tabsBlock'}),
  defineArrayMember({type: 'formBlock'}),
]

export const modalType = defineType({
  name: 'modal',
  title: 'Modal',
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
      title: 'Modal Name',
      type: 'string',
      group: 'content',
      description:
        'Internal editor-facing name used to identify this Modal in Studio and CTA selectors. It is not rendered on the website.',
      validation: (rule) => rule.required().max(120),
    }),

    defineField({
      name: 'key',
      title: 'Key',
      type: 'string',
      group: 'content',
      description:
        'Stable identity shared across translations. Generate it from the Modal Name on the original locale; translated Modals should keep the same Key.',
      components: {
        input: ModalKeyInput,
      },
      validation: (rule) =>
        rule.required().custom((key, context) => validateModalKey(key, context)),
    }),

    defineField({
      name: 'modalTitle',
      title: 'Dialog Title',
      type: 'string',
      group: 'content',
      description:
        'Optional visible heading rendered in the Modal header. Leave blank when the Modal content already provides its own heading.',
      validation: (rule) => rule.max(160),
    }),

    defineField({
      name: 'description',
      title: 'Dialog Description',
      type: 'text',
      rows: 3,
      group: 'content',
      description:
        'Optional visible description rendered directly beneath the Dialog Title. Leave blank when the Modal body already provides this copy.',
      validation: (rule) => rule.max(500),
    }),

    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      group: 'content',
      initialValue: 'md',
      options: {
        layout: 'radio',
        list: [
          {title: 'Small', value: 'sm'},
          {title: 'Medium', value: 'md'},
          {title: 'Large', value: 'lg'},
          {title: 'Extra Large', value: 'xl'},
          {title: 'Full Screen', value: 'full'},
        ],
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'content',
      title: 'Modal Content',
      type: 'array',
      group: 'content',
      description:
        'Build the dialog body from the supported content-focused blocks. Large page-layout blocks are intentionally excluded.',
      of: modalContentMembers,
      validation: (rule) => rule.required().min(1),
    }),

    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'assignment',
      description: 'Website this Modal belongs to.',
      to: [{type: 'site'}],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      group: 'assignment',
      description: 'Regional language version of this Modal.',
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
      modalTitle: 'modalTitle',
      key: 'key',
      site: 'site.name',
      locale: 'locale',
      size: 'size',
    },

    prepare({title, modalTitle, key, site, locale, size}) {
      return {
        title: title || modalTitle || 'Untitled Modal',
        subtitle: [site, locale, size, key].filter(Boolean).join(' • '),
      }
    },
  },
})
