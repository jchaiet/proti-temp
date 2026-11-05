import {defineField, defineType} from 'sanity'

import {validateRequiredLink} from '../validation/linkDestination'
import {validateModalReference} from '../validation/modalReference'
import {siteLocaleReferenceFilter} from '../validation/referenceFilters'

type CtaParent = {
  actionType?: 'link' | 'modal'
}

export const ctaType = defineType({
  name: 'cta',
  title: 'Call to Action',
  type: 'object',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'actionType',
      title: 'Action Type',
      type: 'string',
      initialValue: 'link',
      options: {
        layout: 'radio',
        list: [
          {title: 'Link', value: 'link'},
          {title: 'Open Modal', value: 'modal'},
        ],
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      hidden: ({parent}) => (parent as CtaParent | undefined)?.actionType === 'modal',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as CtaParent | undefined

          /*
           * Existing CTA documents predate actionType. Treat a missing value as
           * the original Link behavior so old content remains valid.
           */
          if (parent?.actionType === 'modal') {
            return true
          }

          return validateRequiredLink(value, 'CTA must have a destination.')
        }),
    }),

    defineField({
      name: 'modal',
      title: 'Modal',
      type: 'reference',
      description:
        'Modal opened by this CTA. Only Modals for the same Site and Locale are available.',
      to: [{type: 'modal'}],
      hidden: ({parent}) => (parent as CtaParent | undefined)?.actionType !== 'modal',
      options: {
        disableNew: true,
        filter: ({document}) => siteLocaleReferenceFilter(document),
      },
      validation: (rule) => rule.custom((value, context) => validateModalReference(value, context)),
    }),

    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',

      initialValue: 'primary',

      options: {
        list: [
          {
            title: 'Primary',
            value: 'primary',
          },
          {
            title: 'Secondary',
            value: 'secondary',
          },
          {
            title: 'Text Link',
            value: 'link',
          },
          {
            title: 'Glass',
            value: 'glass',
          },
        ],

        layout: 'radio',
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',

      initialValue: 'md',

      options: {
        list: [
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
        ],

        layout: 'radio',
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'inverted',
      title: 'Inverted',
      type: 'boolean',

      initialValue: false,

      description: 'Use the inverted button treatment for dark or image backgrounds.',
    }),

    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'iconPicker',

      description: 'Optional icon displayed alongside the button label.',
    }),

    defineField({
      name: 'iconAlignment',
      title: 'Icon Position',
      type: 'string',

      initialValue: 'right',

      hidden: ({parent}) => !parent?.icon || parent.icon === 'none',

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
  ],

  preview: {
    select: {
      title: 'label',
      actionType: 'actionType',
      type: 'link.type',
      page: 'link.internalPage.title',
      url: 'link.externalUrl',
      email: 'link.email',
      phone: 'link.phone',
      anchor: 'link.anchor',
      modalTitle: 'modal.title',
      icon: 'icon',
    },

    prepare({title, actionType, type, page, url, email, phone, anchor, modalTitle, icon}) {
      let destination = 'No destination'

      if (actionType === 'modal') {
        destination = modalTitle ? `Open modal: ${modalTitle}` : 'Open Modal'
      } else {
        switch (type) {
          case 'internal':
            destination = page ?? 'Internal page'
            break

          case 'external':
            destination = url ?? 'External URL'
            break

          case 'email':
            destination = email ? `mailto:${email}` : 'Email'
            break

          case 'phone':
            destination = phone ? `tel:${phone}` : 'Phone'
            break

          case 'anchor':
            destination = anchor ? `#${anchor.replace(/^#/, '')}` : 'Anchor'
            break
        }
      }

      const iconLabel = icon && icon !== 'none' ? ` · ${icon}` : ''

      return {
        title: title ?? 'Untitled CTA',
        subtitle: `${destination}${iconLabel}`,
      }
    },
  },
})
