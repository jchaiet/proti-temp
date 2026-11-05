import {defineField, defineType} from 'sanity'
import {SeoDefaultsLocaleInput} from '../../components/inputs/SeoDefaultsLocaleInput'
import {createAccessibleImageFields} from './accessibleImageFields'

type SiteLocale = {
  code?: string
  label?: string
}

export const siteSeoDefaultsType = defineType({
  name: 'siteSeoDefaults',
  title: 'Locale SEO Defaults',
  type: 'object',

  fields: [
    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      description: 'Locale these SEO defaults apply to.',
      components: {
        input: SeoDefaultsLocaleInput,
      },
      validation: (rule) =>
        rule.required().custom((locale, context) => {
          if (!locale) {
            return true
          }

          const locales = (context.document?.locales as SiteLocale[] | undefined) ?? []

          const localeExists = locales.some((item) => item.code === locale)

          return localeExists ? true : 'Locale must be one of the Site’s Supported Locales.'
        }),
    }),

    defineField({
      name: 'siteTitle',
      title: 'Site Title',
      type: 'string',
      description:
        'Locale-specific site title. Used as the homepage/fallback title when a document does not provide its own SEO title.',
      validation: (rule) =>
        rule.max(60).warning('Search engines may truncate titles longer than about 60 characters.'),
    }),

    defineField({
      name: 'titleTemplate',
      title: 'Title Template',
      type: 'string',
      description:
        'Optional template for document titles. Use %s where the document title should appear. Example: %s | Acme.',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) {
            return true
          }

          return value.includes('%s')
            ? true
            : 'Title Template must include %s where the document title should appear.'
        }),
    }),

    defineField({
      name: 'metaDescription',
      title: 'Default Meta Description',
      type: 'text',
      rows: 3,
      description:
        'Locale-specific fallback description used when a Page or Blog does not provide its own SEO description.',
      validation: (rule) =>
        rule
          .max(160)
          .warning('Search engines may truncate descriptions longer than about 160 characters.'),
    }),

    defineField({
      name: 'socialImage',
      title: 'Default Social Sharing Image',
      type: 'image',
      description: 'Default Open Graph/social image for this locale.',
      options: {
        hotspot: true,
      },
      fields: createAccessibleImageFields('Image'),
    }),

    defineField({
      name: 'indexing',
      title: 'Default Search Engine Indexing',
      type: 'string',
      initialValue: 'index',
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Allow Indexing',
            value: 'index',
          },
          {
            title: 'Hide from Search Engines',
            value: 'noindex',
          },
        ],
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'following',
      title: 'Default Link Following',
      type: 'string',
      initialValue: 'follow',
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Allow Following',
            value: 'follow',
          },
          {
            title: 'Prevent Following',
            value: 'nofollow',
          },
        ],
      },
      validation: (rule) => rule.required(),
    }),
  ],

  preview: {
    select: {
      locale: 'locale',
      siteTitle: 'siteTitle',
      description: 'metaDescription',
      media: 'socialImage',
    },

    prepare({locale, siteTitle, description, media}) {
      return {
        title: locale ? `SEO • ${locale}` : 'Locale SEO Defaults',
        subtitle: [siteTitle, description].filter(Boolean).join(' • '),
        media,
      }
    },
  },
})
