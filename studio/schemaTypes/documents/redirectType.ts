import {defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {validateRedirectSourcePath} from '../validation/redirectSource'
import {validateSiteLocale} from '../validation/siteLocale'

export const redirectType = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',

  groups: [
    {name: 'redirect', title: 'Redirect', default: true},
    {name: 'assignment', title: 'Site & Locale'},
  ],

  fields: [
    defineField({
      name: 'sourcePath',
      title: 'Source Path',
      type: 'string',
      group: 'redirect',
      description:
        'Locale-relative path that should redirect. Start with /. Do not include the locale prefix, query string, or hash.',
      validation: (rule) =>
        rule.required().custom((value, context) => validateRedirectSourcePath(value, context)),
    }),

    defineField({
      name: 'destination',
      title: 'Destination',
      type: 'redirectDestination',
      group: 'redirect',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'redirectType',
      title: 'Redirect Type',
      type: 'string',
      group: 'redirect',
      initialValue: 'permanent',
      options: {
        layout: 'radio',
        list: [
          {title: 'Permanent (308)', value: 'permanent'},
          {title: 'Temporary (307)', value: 'temporary'},
        ],
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'preserveQuery',
      title: 'Preserve Query Parameters',
      type: 'boolean',
      group: 'redirect',
      initialValue: true,
      description:
        'When enabled, query parameters from the original request are appended to the redirect destination.',
    }),

    defineField({
      name: 'enabled',
      title: 'Enabled',
      type: 'boolean',
      group: 'redirect',
      initialValue: true,
      description: 'Disable this Redirect without deleting or unpublishing it.',
    }),

    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'assignment',
      description: 'Website this Redirect belongs to.',
      to: [{type: 'site'}],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      group: 'assignment',
      description: 'Regional language version this Redirect applies to.',
      components: {
        input: PageLocaleInput,
      },
      validation: (rule) =>
        rule.required().custom((locale, context) => validateSiteLocale(locale, context)),
    }),
  ],

  orderings: [
    {
      title: 'Source Path, A–Z',
      name: 'sourcePathAsc',
      by: [{field: 'sourcePath', direction: 'asc'}],
    },
  ],

  preview: {
    select: {
      sourcePath: 'sourcePath',
      destinationType: 'destination.type',
      destinationPath: 'destination.path',
      destinationPage: 'destination.internalPage.title',
      externalUrl: 'destination.externalUrl',
      redirectType: 'redirectType',
      enabled: 'enabled',
      site: 'site.name',
      locale: 'locale',
    },

    prepare({
      sourcePath,
      destinationType,
      destinationPath,
      destinationPage,
      externalUrl,
      redirectType,
      enabled,
      site,
      locale,
    }) {
      let destination = 'Destination not configured'

      if (destinationType === 'internal') {
        destination = destinationPage ?? 'Internal Page'
      }

      if (destinationType === 'path') {
        destination = destinationPath ?? 'Path'
      }

      if (destinationType === 'external') {
        destination = externalUrl ?? 'External URL'
      }

      const status = redirectType === 'temporary' ? '307' : '308'

      return {
        title: sourcePath ?? 'Untitled Redirect',
        subtitle: [enabled === false ? 'Disabled' : status, destination, site, locale]
          .filter(Boolean)
          .join(' • '),
      }
    },
  },
})
