import {defineArrayMember, defineField, defineType} from 'sanity'

import {TaxonomyTranslationsInput} from '../../components/inputs/TaxonomyTranslationsInput'
import {
  buildTaxonomyPreviewPath,
  createTaxonomyPreviewAncestorSelect,
} from '../../utils/taxonomyPath'
import {validateSiteTranslations} from '../validation/siteTranslations'
import {validateTaxonomyRouteIntegrity} from '../validation/taxonomyRoutes'
import {siteReferenceFilter} from '../validation/referenceFilters'
import {validateTaxonomyParent} from '../validation/taxonomyParent'
import {validateTaxonomySlug} from '../validation/taxonomySlug'

const taxonomyPreviewSelect = {
  title: 'title',
  slug: 'slug.current',
  site: 'site.name',
  kind: 'kind',
  includeInFilters: 'includeInFilters',
  includeInBlogTags: 'includeInBlogTags',
  translationCount: 'translations',
  ...createTaxonomyPreviewAncestorSelect(),
}

export const taxonomyType = defineType({
  name: 'taxonomy',
  title: 'Taxonomy Item',
  type: 'document',

  validation: (rule) =>
    rule
      .custom((document, context) =>
        validateSiteTranslations(document, context, {
          documentLabel: 'Taxonomy',
          baseFieldsLabel: 'base Title and Description fields',
        }),
      )
      .custom((document, context) => validateTaxonomyRouteIntegrity(document, context)),

  groups: [
    {
      name: 'content',
      title: 'Content',
      default: true,
    },
    {
      name: 'translations',
      title: 'Translations',
    },
    {
      name: 'usage',
      title: 'Usage',
    },
    {
      name: 'assignment',
      title: 'Site & Hierarchy',
    },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description:
        'Taxonomy display name for the Site default Locale. Other locale labels are stored in Translations.',
      validation: (rule) => rule.required().max(160),
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Optional Taxonomy description for the Site default Locale.',
      validation: (rule) => rule.max(500),
    }),

    defineField({
      name: 'translations',
      title: 'Translations',
      type: 'array',
      group: 'translations',
      description:
        'Locale-specific display text. Locales are generated automatically from the selected Site.',
      components: {
        input: TaxonomyTranslationsInput,
      },
      of: [
        defineArrayMember({
          name: 'taxonomyTranslation',
          title: 'Taxonomy Translation',
          type: 'object',

          fields: [
            defineField({
              name: 'locale',
              title: 'Locale',
              type: 'string',
              readOnly: true,
              validation: (rule) => rule.required(),
            }),

            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (rule) => rule.required().max(160),
            }),

            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 3,
              validation: (rule) => rule.max(500),
            }),
          ],

          preview: {
            select: {
              title: 'title',
              locale: 'locale',
            },

            prepare({title, locale}) {
              return {
                title: title ?? 'Untitled Translation',
                subtitle: locale,
              }
            },
          },
        }),
      ],
    }),

    defineField({
      name: 'kind',
      title: 'Taxonomy Type',
      type: 'string',
      group: 'usage',

      description:
        'Terms can be assigned to content. Groups / Folders exist only to organize the Taxonomy hierarchy. Existing items with no value are treated as Terms.',

      initialValue: 'term',

      options: {
        list: [
          {
            title: 'Taxonomy Term',
            value: 'term',
          },
          {
            title: 'Group / Folder',
            value: 'group',
          },
        ],

        layout: 'radio',
      },

      validation: (rule) =>
        rule.custom((value) => {
          if (!value || value === 'term' || value === 'group') {
            return true
          }

          return 'Choose Taxonomy Term or Group / Folder.'
        }),
    }),

    defineField({
      name: 'includeInFilters',
      title: 'Include in Visitor Filters',
      type: 'boolean',
      group: 'usage',

      description:
        'When enabled, this Taxonomy Term can be exposed as a visitor-facing Document List filter. This does not affect whether the Term can be assigned to content.',

      initialValue: true,

      hidden: ({parent}) => parent?.kind === 'group',
    }),

    defineField({
      name: 'includeInBlogTags',
      title: 'Available for Blog Tagging',
      type: 'boolean',
      group: 'usage',

      description:
        'When enabled, this Taxonomy Term can be selected on Blog articles. Disable this for administrative or internal Terms that should remain unavailable to Blog authors.',

      initialValue: true,

      hidden: ({parent}) => parent?.kind === 'group',
    }),

    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'assignment',
      description: 'Website this Taxonomy Term belongs to.',
      to: [
        {
          type: 'site',
        },
      ],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'parent',
      title: 'Parent Taxonomy Item',
      type: 'reference',
      group: 'assignment',
      description: 'Optional parent Term or Group used to build the hierarchical Taxonomy path.',

      to: [
        {
          type: 'taxonomy',
        },
      ],

      options: {
        disableNew: true,

        filter: ({document}) =>
          siteReferenceFilter(document, {
            excludeCurrentDocument: true,
          }),
      },

      validation: (rule) => rule.custom((value, context) => validateTaxonomyParent(value, context)),
    }),

    defineField({
      name: 'slug',
      title: 'URL Segment',
      type: 'slug',
      group: 'assignment',
      description:
        'Shared URL segment for every locale. Parent Taxonomy segments are added automatically.',

      options: {
        source: 'title',
        maxLength: 96,

        /*
         * Sanity's default slug uniqueness check is global to Taxonomy.
         * Taxonomy route uniqueness is Site/path scoped and is enforced by
         * validateTaxonomyRouteIntegrity(...) at the document level.
         */
        isUnique: () => true,
      },

      validation: (rule) => rule.required().custom((slug) => validateTaxonomySlug(slug)),
    }),
  ],

  orderings: [
    {
      title: 'Title',
      name: 'titleAsc',
      by: [
        {
          field: 'title',
          direction: 'asc',
        },
      ],
    },
  ],

  preview: {
    select: taxonomyPreviewSelect,

    prepare(selection) {
      const {title, slug, site, kind, includeInFilters, includeInBlogTags, translationCount} =
        selection as {
          title?: string
          slug?: string
          site?: string
          kind?: string
          includeInFilters?: boolean
          includeInBlogTags?: boolean
          translationCount?: unknown[]
        } & Record<string, unknown>

      const translatedLocales = Array.isArray(translationCount) ? translationCount.length : 0

      const taxonomyKind = kind === 'group' ? 'Group / Folder' : 'Taxonomy Term'

      const filterStatus =
        kind === 'group'
          ? undefined
          : includeInFilters === false
            ? 'Hidden from filters'
            : undefined

      const blogTagStatus =
        kind === 'group'
          ? undefined
          : includeInBlogTags === false
            ? 'Hidden from Blog tagging'
            : undefined

      const path = buildTaxonomyPreviewPath(slug, selection as Record<string, unknown>)

      return {
        title: title ?? 'Untitled Taxonomy Item',
        subtitle: [
          site,
          taxonomyKind,
          filterStatus,
          blogTagStatus,
          path,
          translatedLocales > 0
            ? `${translatedLocales} translation${translatedLocales === 1 ? '' : 's'}`
            : undefined,
        ]
          .filter(Boolean)
          .join(' • '),
      }
    },
  },
})
