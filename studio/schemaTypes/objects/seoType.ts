import {defineField, defineType} from 'sanity'
import {createAccessibleImageFields} from './accessibleImageFields'
import {validateCanonicalUrl} from '../validation/webUrls'

export const seoType = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',

  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      description:
        'Optional search/social title override. Leave blank to use the document title and Site title template.',
      validation: (rule) =>
        rule.max(60).warning('Search engines may truncate titles longer than about 60 characters.'),
    }),

    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description:
        'Optional search/social description override. Leave blank to use the document or Site fallback.',
      validation: (rule) =>
        rule
          .max(160)
          .warning('Search engines may truncate descriptions longer than about 160 characters.'),
    }),

    defineField({
      name: 'socialImage',
      title: 'Social Sharing Image',
      type: 'image',
      fields: createAccessibleImageFields('Social sharing image'),
      description:
        'Optional Open Graph and social sharing image override. Leave blank to inherit the Site + Locale default.',
      options: {
        hotspot: true,
      },
    }),

    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL Override',
      type: 'url',
      description:
        'Leave blank to automatically use this document’s public URL. Only set this when the canonical should point somewhere else.',
      validation: (rule) =>
        rule
          .uri({
            scheme: ['http', 'https'],
          })
          .custom((value) => validateCanonicalUrl(value)),
    }),

    defineField({
      name: 'indexing',
      title: 'Search Engine Indexing',
      type: 'string',
      initialValue: 'inherit',
      description: 'Usually inherit the Site + Locale SEO default.',
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Inherit Site Default',
            value: 'inherit',
          },
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
      title: 'Search Engine Link Following',
      type: 'string',
      initialValue: 'inherit',
      description: 'Usually inherit the Site + Locale SEO default.',
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Inherit Site Default',
            value: 'inherit',
          },
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
      title: 'metaTitle',
      description: 'metaDescription',
      indexing: 'indexing',
      following: 'following',
      media: 'socialImage',
    },

    prepare({title, description, indexing, following, media}) {
      const robots = [
        indexing && indexing !== 'inherit' ? indexing : undefined,
        following && following !== 'inherit' ? following : undefined,
      ]
        .filter(Boolean)
        .join(', ')

      return {
        title: title || 'SEO defaults',
        subtitle: [description, robots || undefined].filter(Boolean).join(' • '),
        media,
      }
    },
  },
})
