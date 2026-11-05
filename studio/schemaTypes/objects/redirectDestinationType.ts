import {defineField, defineType} from 'sanity'

import {
  validateRedirectExternalUrlRequired,
  validateRedirectInternalPage,
  validateRedirectPathDestination,
} from '../validation/redirectDestination'
import {siteLocaleReferenceFilter} from '../validation/referenceFilters'
import {validateExternalRedirectUrl} from '../validation/webUrls'

export const redirectDestinationType = defineType({
  name: 'redirectDestination',
  title: 'Destination',
  type: 'object',

  fields: [
    defineField({
      name: 'type',
      title: 'Destination Type',
      type: 'string',
      initialValue: 'internal',
      options: {
        layout: 'radio',
        list: [
          {title: 'Internal Page', value: 'internal'},
          {title: 'Path', value: 'path'},
          {title: 'External URL', value: 'external'},
        ],
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'internalPage',
      title: 'Internal Page',
      type: 'reference',
      to: [{type: 'page'}],
      hidden: ({parent}) => parent?.type !== 'internal',
      options: {
        disableNew: true,
        filter: ({document}) => siteLocaleReferenceFilter(document),
      },
      validation: (rule) =>
        rule.custom((value, context) => validateRedirectInternalPage(value, context)),
    }),

    defineField({
      name: 'path',
      title: 'Destination Path',
      type: 'string',
      description:
        'Locale-relative path on this Site. Start with /. Do not include the locale prefix, query string, or hash.',
      hidden: ({parent}) => parent?.type !== 'path',
      validation: (rule) =>
        rule.custom((value, context) => validateRedirectPathDestination(value, context)),
    }),

    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      hidden: ({parent}) => parent?.type !== 'external',
      validation: (rule) =>
        rule
          .custom((value, context) => validateRedirectExternalUrlRequired(value, context))
          .uri({
            scheme: ['http', 'https'],
          })
          .custom((value, context) => validateExternalRedirectUrl(value, context)),
    }),
  ],

  preview: {
    select: {
      type: 'type',
      internalPageTitle: 'internalPage.title',
      path: 'path',
      externalUrl: 'externalUrl',
    },

    prepare({type, internalPageTitle, path, externalUrl}) {
      if (type === 'internal') {
        return {
          title: internalPageTitle ?? 'Select Internal Page',
          subtitle: 'Internal Page',
        }
      }

      if (type === 'path') {
        return {
          title: path ?? 'Enter Path',
          subtitle: 'Path',
        }
      }

      if (type === 'external') {
        return {
          title: externalUrl ?? 'Enter External URL',
          subtitle: 'External URL',
        }
      }

      return {title: 'Destination'}
    },
  },
})
