import {defineArrayMember, defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {
  validateSameSiteReference,
  validateSameSiteReferenceArray,
} from '../validation/siteReferences'
import {validateBlogTaxonomyRouteCollision} from '../validation/taxonomyRoutes'
import {validateBlogHeadingQuality} from '../validation/headingQuality'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'
import {siteReferenceFilter, taxonomyBlogTagReferenceFilter} from '../validation/referenceFilters'
import {validateSiteLocale} from '../validation/siteLocale'
import {isBlogSlugUnique, validateBlogSlug} from '../validation/blogSlug'
import {validateBlogEditorial} from '../validation/blogEditorial'
import {validateTaxonomyUsageReferences} from '../validation/taxonomyUsage'

export const blogType = defineType({
  name: 'blog',
  title: 'Blog',
  type: 'document',

  validation: (rule) =>
    rule
      .custom((document, context) =>
        validateSameSiteReference(document, context, {
          fieldName: 'author',
          referenceType: 'author',
          referenceLabel: 'Author',
          documentLabel: 'Blog',
        }),
      )
      .custom((document, context) =>
        validateSameSiteReferenceArray(document, context, {
          fieldName: 'taxonomy',
          referenceType: 'taxonomy',
          referenceLabel: 'Taxonomy Term',
          documentLabel: 'Blog',
        }),
      )
      .custom((document, context) =>
        validateTaxonomyUsageReferences(
          document?.taxonomy as {_ref?: string}[] | undefined,
          context,
          {
            requireBlogTaggable: true,
          },
        ),
      )
      .custom((document, context) =>
        validateSameSiteReference(document, context, {
          fieldName: 'reviewer',
          referenceType: 'author',
          referenceLabel: 'Reviewer',
          documentLabel: 'Blog',
        }),
      )
      .custom((document) => validateBlogEditorial(document))
      .custom((document, context) => validateBlogTaxonomyRouteCollision(document, context)),

  groups: [
    {
      name: 'content',
      title: 'Content',
      default: true,
    },
    {
      name: 'editorial',
      title: 'Editorial',
    },
    {
      name: 'taxonomy',
      title: 'Taxonomy',
    },
    {
      name: 'routing',
      title: 'Routing',
    },
    {
      name: 'seo',
      title: 'SEO',
    },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      group: 'content',
      description:
        'Short description used in Blog cards, search results, listings, and as the default SEO and structured-data description. It is not shown in the article unless enabled below.',
      rows: 3,
      validation: (rule) => rule.required().max(300),
    }),

    defineField({
      name: 'showSummaryInArticle',
      title: 'Show Summary in Article',
      type: 'boolean',
      group: 'content',
      description:
        'Display the Summary beneath the Blog title in the article hero. This only controls on-page display; the Summary is still used for cards, search results, listings, SEO metadata, and structured data.',
      initialValue: false,
    }),

    defineField({
      name: 'mainImage',
      title: 'Featured Image',
      type: 'image',
      fields: createAccessibleImageFields('Featured image'),
      group: 'content',
      options: {
        hotspot: true,
      },
    }),

    defineField({
      name: 'publishedAt',
      title: 'Published Date',
      type: 'datetime',
      group: 'content',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      group: 'content',
      description:
        'Shared Author record for this Blog. Locale-specific Author display fields are stored on the Author document.',

      to: [
        {
          type: 'author',
        },
      ],

      options: {
        disableNew: true,

        filter: ({document}) => siteReferenceFilter(document),
      },
    }),

    defineField({
      name: 'lastModifiedAt',
      title: 'Last Updated Date',
      type: 'datetime',
      group: 'editorial',
      description:
        'Set this only when the published article is materially revised. Routine CMS edits do not automatically become an editorial update.',
    }),

    defineField({
      name: 'reviewer',
      title: 'Reviewed By',
      type: 'reference',
      group: 'editorial',
      description:
        'Optional Author record for the person who reviewed this article for accuracy or completeness.',
      to: [
        {
          type: 'author',
        },
      ],
      options: {
        disableNew: true,
        filter: ({document}) => siteReferenceFilter(document),
      },
    }),

    defineField({
      name: 'reviewedAt',
      title: 'Review Date',
      type: 'datetime',
      group: 'editorial',
      description: 'Date this article was reviewed by the selected Reviewer.',
      hidden: ({document}) => !document?.reviewer,
    }),

    defineField({
      name: 'sources',
      title: 'Sources',
      type: 'array',
      group: 'editorial',
      description:
        'Published references that support the article. These are displayed to readers and included in structured data.',
      of: [
        defineArrayMember({
          type: 'citationSource',
        }),
      ],
      validation: (rule) => rule.max(50),
    }),

    defineField({
      name: 'sections',
      title: 'Blog Content',
      type: 'array',
      group: 'content',
      description:
        'Build the Blog body using the same reusable Page Builder blocks used elsewhere on the site.',
      of: [
        defineArrayMember({
          type: 'contentBlock',
        }),

        defineArrayMember({
          type: 'richTextBlock',
        }),

        defineArrayMember({
          type: 'carouselBlock',
        }),

        defineArrayMember({
          type: 'accordionBlock',
        }),

        defineArrayMember({
          type: 'tabsBlock',
        }),

        defineArrayMember({
          type: 'gridBlock',
        }),

        defineArrayMember({
          type: 'formBlock',
        }),

        defineArrayMember({
          type: 'documentListBlock',
        }),

        defineArrayMember({
          type: 'pollBlock',
        }),

        defineArrayMember({
          type: 'singletonReferenceBlock',
        }),
      ],

      validation: (rule) =>
        rule.custom((sections, context) => validateBlogHeadingQuality(sections, context)).warning(),
    }),

    defineField({
      name: 'taxonomy',
      title: 'Taxonomy',
      type: 'array',
      group: 'taxonomy',
      description:
        'Locale-neutral Taxonomy concepts used for organization, routing, search, related content, and dynamic filtering. Display labels are localized inside each Taxonomy Term.',

      of: [
        defineArrayMember({
          type: 'reference',

          to: [
            {
              type: 'taxonomy',
            },
          ],

          options: {
            disableNew: true,

            filter: ({document}) => taxonomyBlogTagReferenceFilter(document),
          },
        }),
      ],

      validation: (rule) => rule.unique(),
    }),

    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
      description:
        'Optional search and social metadata overrides. Unset values inherit the Site + Locale SEO defaults.',
    }),

    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'routing',
      description: 'Website this Blog belongs to.',
      to: [{type: 'site'}],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      group: 'routing',
      description:
        'Regional language version of this Blog. The Site default Locale is omitted from public URLs.',
      components: {
        input: PageLocaleInput,
      },
      validation: (rule) =>
        rule.required().custom((locale, context) => validateSiteLocale(locale, context)),
    }),

    defineField({
      name: 'slug',
      title: 'URL Segment',
      type: 'slug',
      group: 'routing',
      description: 'This Blog’s portion of the public URL. Example: /blog/my-first-post',
      options: {
        source: 'title',
        maxLength: 96,

        /*
         * Sanity's default slug uniqueness check is global to the
         * document type, which would incorrectly reject:
         *
         * en-us /blog/my-article
         * es-us /blog/my-article
         *
         * Blogs only need to be unique within the same Site + Locale.
         */
        isUnique: (slug, context) => isBlogSlugUnique(slug, context),
      },
      validation: (rule) =>
        rule.required().custom((slug, context) => validateBlogSlug(slug, context)),
    }),
  ],

  orderings: [
    {
      title: 'Published Date, Newest',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
    {
      title: 'Published Date, Oldest',
      name: 'publishedAtAsc',
      by: [{field: 'publishedAt', direction: 'asc'}],
    },
  ],

  preview: {
    select: {
      title: 'title',
      publishedAt: 'publishedAt',
      media: 'mainImage',
      locale: 'locale',
      site: 'site.name',
    },

    prepare({title, publishedAt, media, locale, site}) {
      const date = publishedAt ? new Date(publishedAt).toLocaleDateString() : undefined

      return {
        title: title || 'Untitled Blog',
        subtitle: [site, locale, date].filter(Boolean).join(' • '),
        media,
      }
    },
  },
})
