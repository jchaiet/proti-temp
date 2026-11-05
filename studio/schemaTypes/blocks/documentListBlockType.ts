import {defineArrayMember, defineField, defineType} from 'sanity'

import {TaxonomyFilterPickerInput} from '../../components/inputs/TaxonomyFilterPickerInput'

import {
  validateDocumentListTaxonomyFilterGroups,
  validateDocumentListTaxonomyReferences,
} from '../validation/documentListTaxonomy'
import {
  taxonomyTermReferenceFilter,
  taxonomyVisitorFilterReferenceFilter,
} from '../validation/referenceFilters'

type TaxonomyReference = {
  _ref?: string
}

export const documentListBlockType = defineType({
  name: 'documentListBlock',
  title: 'Document List',
  type: 'object',

  groups: [
    {
      name: 'content',
      title: 'Content',
      default: true,
    },
    {
      name: 'dataSource',
      title: 'Data Source',
    },
    {
      name: 'searchFilters',
      title: 'Search & Filters',
    },
    {
      name: 'sortingPagination',
      title: 'Sorting & Pagination',
    },
    {
      name: 'styles',
      title: 'Styles',
    },
  ],

  fields: [
    /* === Heading === */

    defineField({
      name: 'heading',
      group: 'content',
      title: 'Heading',
      type: 'sectionHeading',
    }),

    /* === Content Source === */

    defineField({
      name: 'sourceMode',
      group: 'dataSource',
      title: 'Content Source',
      type: 'string',

      description:
        'Choose where list items come from: manually authored cards or dynamically loaded content.',

      initialValue: 'manual',

      options: {
        list: [
          {
            title: 'Manual Selection',
            value: 'manual',
          },
          {
            title: 'Dynamic',
            value: 'dynamic',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    /* === Manual Content === */

    defineField({
      name: 'documents',
      group: 'dataSource',
      title: 'Documents',
      type: 'array',

      description: 'Manually select and order the items that should appear in this document list.',

      hidden: ({parent}) => parent?.sourceMode === 'dynamic',

      of: [
        defineArrayMember({
          type: 'resourceCard',
        }),

        defineArrayMember({
          type: 'articleCard',
        }),

        defineArrayMember({
          type: 'testimonialCard',
        }),
      ],

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode !== 'dynamic' && (!Array.isArray(value) || value.length === 0)) {
            return 'Add at least one item when using Manual Selection.'
          }

          return true
        }),
    }),

    /* === Dynamic Content === */

    defineField({
      name: 'dynamicContentTypes',
      group: 'dataSource',
      title: 'Content Types',
      type: 'array',

      description:
        'Choose which types of content are eligible to appear in this list. Select all available types for a site-wide search.',

      hidden: ({parent}) => parent?.sourceMode !== 'dynamic',

      of: [
        defineArrayMember({
          type: 'string',
        }),
      ],

      options: {
        list: [
          {
            title: 'Pages',
            value: 'page',
          },
          {
            title: 'Articles',
            value: 'article',
          },
          {
            title: 'Blog Posts',
            value: 'blog',
          },
          {
            title: 'News',
            value: 'news',
          },
          {
            title: 'Resources',
            value: 'resource',
          },
        ],
      },

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode === 'dynamic' && (!Array.isArray(value) || value.length === 0)) {
            return 'Select at least one content type for dynamic loading.'
          }

          return true
        }),
    }),

    defineField({
      name: 'dynamicTaxonomy',
      group: 'dataSource',
      title: 'Taxonomy',
      type: 'array',

      description:
        'Optionally restrict dynamic results to content assigned to specific taxonomy terms.',

      hidden: ({parent}) => parent?.sourceMode !== 'dynamic',

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

            filter: ({document}) => taxonomyTermReferenceFilter(document),
          },
        }),
      ],

      validation: (Rule) =>
        Rule.unique().custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode !== 'dynamic') {
            return true
          }

          return validateDocumentListTaxonomyReferences(
            value as TaxonomyReference[] | undefined,
            context,
          )
        }),
    }),

    defineField({
      name: 'dynamicTaxonomyMatchLogic',
      group: 'dataSource',
      title: 'Taxonomy Match',
      type: 'string',

      description:
        'Any Match includes content assigned to at least one selected taxonomy term. All Match requires every selected taxonomy term.',

      initialValue: 'any',

      hidden: ({parent}) =>
        parent?.sourceMode !== 'dynamic' ||
        !Array.isArray(parent?.dynamicTaxonomy) ||
        parent.dynamicTaxonomy.length === 0,

      options: {
        list: [
          {
            title: 'Any Match',
            value: 'any',
          },
          {
            title: 'All Match',
            value: 'all',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
                dynamicTaxonomy?: unknown[]
              }
            | undefined

          const hasTaxonomy =
            parent?.sourceMode === 'dynamic' &&
            Array.isArray(parent.dynamicTaxonomy) &&
            parent.dynamicTaxonomy.length > 0

          if (hasTaxonomy && !value) {
            return 'Choose how selected taxonomy terms should be matched.'
          }

          return true
        }),
    }),

    defineField({
      name: 'dynamicSort',
      group: 'sortingPagination',
      title: 'Initial Sort',
      type: 'string',

      description: 'Controls the initial order of dynamically loaded content.',

      initialValue: 'newest',

      hidden: ({parent}) => parent?.sourceMode !== 'dynamic',

      options: {
        list: [
          {
            title: 'Newest First',
            value: 'newest',
          },
          {
            title: 'Oldest First',
            value: 'oldest',
          },
          {
            title: 'Title A–Z',
            value: 'title-asc',
          },
          {
            title: 'Title Z–A',
            value: 'title-desc',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode === 'dynamic' && !value) {
            return 'Initial sort is required for dynamic loading.'
          }

          return true
        }),
    }),

    defineField({
      name: 'dynamicLimit',
      group: 'sortingPagination',
      title: 'Maximum Results',
      type: 'number',

      description:
        'Maximum number shown before a visitor searches. Search queries use the full selected content scope.',

      initialValue: 50,

      hidden: ({parent}) => parent?.sourceMode !== 'dynamic',

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                sourceMode?: string
              }
            | undefined

          if (parent?.sourceMode === 'dynamic' && (typeof value !== 'number' || value < 1)) {
            return 'Maximum results must be at least 1.'
          }

          if (parent?.sourceMode === 'dynamic' && typeof value === 'number' && value > 200) {
            return 'Maximum results cannot exceed 200.'
          }

          return true
        }),
    }),

    /* === Display === */

    defineField({
      name: 'alignment',
      group: 'content',
      title: 'Heading Alignment',
      type: 'string',

      initialValue: 'left',

      options: {
        list: [
          {
            title: 'Left',
            value: 'left',
          },
          {
            title: 'Center',
            value: 'center',
          },
          {
            title: 'Right',
            value: 'right',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'gridCols',
      group: 'content',
      title: 'Grid Columns',
      type: 'number',

      initialValue: 3,

      options: {
        list: [
          {
            title: '1 Column',
            value: 1,
          },
          {
            title: '2 Columns',
            value: 2,
          },
          {
            title: '3 Columns',
            value: 3,
          },
          {
            title: '4 Columns',
            value: 4,
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required().integer().min(1).max(4),
    }),

    /* === Search === */

    defineField({
      name: 'enableSearch',
      group: 'searchFilters',
      title: 'Enable Search',
      type: 'boolean',

      description: 'Allow visitors to search within the content available to this Document List.',

      initialValue: true,
    }),

    defineField({
      name: 'searchPlaceholder',
      group: 'searchFilters',
      title: 'Search Placeholder',
      type: 'string',

      initialValue: 'Search documents...',

      hidden: ({parent}) => parent?.enableSearch === false,
    }),

    defineField({
      name: 'requireSearchQuery',
      group: 'searchFilters',
      title: 'Require Search or Filter',
      type: 'boolean',

      description:
        'When enabled, no dynamic results are loaded until the visitor enters a search term or selects a filter. Useful for dedicated search and faceted-browsing experiences.',

      initialValue: false,

      hidden: ({parent}) =>
        parent?.sourceMode !== 'dynamic' ||
        (parent?.enableSearch === false && parent?.enableFilters !== true),
    }),

    defineField({
      name: 'initialStateText',
      group: 'searchFilters',
      title: 'Initial State Text',
      type: 'string',

      description: 'Displayed before the visitor enters a search term or selects a filter.',

      initialValue: 'Enter a search term or select a filter to begin.',

      hidden: ({parent}) =>
        parent?.sourceMode !== 'dynamic' ||
        (parent?.enableSearch === false && parent?.enableFilters !== true) ||
        parent?.requireSearchQuery !== true,
    }),

    /* === Visitor Filters === */

    defineField({
      name: 'enableFilters',
      group: 'searchFilters',
      title: 'Enable Filters',
      type: 'boolean',

      description: 'Show visitor-facing filtering controls for this Document List.',

      initialValue: false,
    }),

    defineField({
      name: 'filterTitle',
      group: 'searchFilters',
      title: 'Filter Title',
      type: 'string',

      initialValue: 'Categories',

      hidden: ({parent}) => !parent?.enableFilters,
    }),

    defineField({
      name: 'filterLogic',
      group: 'searchFilters',
      title: 'Filter Selection',
      type: 'string',

      description:
        'Single Selection allows one filter at a time. Multiple Selection allows several.',

      initialValue: 'radio',

      hidden: ({parent}) => !parent?.enableFilters,

      options: {
        list: [
          {
            title: 'Single Selection',
            value: 'radio',
          },
          {
            title: 'Multiple Selection',
            value: 'checkbox',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                enableFilters?: boolean
              }
            | undefined

          if (parent?.enableFilters && !value) {
            return 'Filter selection type is required when filters are enabled.'
          }

          return true
        }),
    }),

    defineField({
      name: 'filterOptions',
      group: 'searchFilters',
      title: 'Filter Options',
      type: 'array',

      description: 'Define filters visitors can use. Use "all" as the value for an All option.',

      hidden: ({parent}) => !parent?.enableFilters,

      of: [
        defineArrayMember({
          name: 'filterOption',
          title: 'Filter Option',
          type: 'object',

          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',

              description: 'Machine-readable value, for example: article, blog, reports, guides.',

              validation: (Rule) => Rule.required(),
            }),
          ],

          preview: {
            select: {
              title: 'label',
              value: 'value',
            },

            prepare({title, value}) {
              return {
                title: title || 'Filter Option',

                subtitle: value || undefined,
              }
            },
          },
        }),
      ],
    }),

    defineField({
      name: 'taxonomyFilterGroups',
      group: 'searchFilters',
      title: 'Taxonomy Filter Groups',
      type: 'array',

      description:
        "Create visitor-facing filter groups such as Type or Treatment. Groups are combined with AND; selections inside each group use that group's matching rules.",

      hidden: ({parent}) => !parent?.enableFilters || parent?.sourceMode !== 'dynamic',

      of: [
        defineArrayMember({
          name: 'taxonomyFilterGroup',
          title: 'Filter Group',
          type: 'object',

          fields: [
            defineField({
              name: 'title',
              title: 'Group Title',
              type: 'string',

              description:
                'Public heading displayed above this group, for example Type or Treatment.',

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'logic',
              title: 'Selection',
              type: 'string',

              description:
                'Single Selection allows one Taxonomy Term at a time. Multiple Selection allows several.',

              initialValue: 'checkbox',

              options: {
                list: [
                  {
                    title: 'Single Selection',
                    value: 'radio',
                  },
                  {
                    title: 'Multiple Selection',
                    value: 'checkbox',
                  },
                ],

                layout: 'radio',
              },

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'matchLogic',
              title: 'Match Within Group',
              type: 'string',

              description:
                'Any Match includes content assigned to at least one selected Term. All Match requires every selected Term. Separate Filter Groups are always combined with AND.',

              initialValue: 'any',

              hidden: ({parent}) => parent?.logic !== 'checkbox',

              options: {
                list: [
                  {
                    title: 'Any Match',
                    value: 'any',
                  },
                  {
                    title: 'All Match',
                    value: 'all',
                  },
                ],

                layout: 'radio',
              },
            }),

            defineField({
              name: 'taxonomy',
              title: 'Taxonomy Terms',
              type: 'array',

              description:
                'Choose the filterable Taxonomy Terms shown inside this group. Full Taxonomy paths are shown while authoring, while the public UI uses each Term label.',

              components: {
                input: TaxonomyFilterPickerInput,
              },

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

                    filter: ({document}) => taxonomyVisitorFilterReferenceFilter(document),
                  },
                }),
              ],

              validation: (Rule) =>
                Rule.required()
                  .min(1)
                  .unique()
                  .custom((value, context) =>
                    validateDocumentListTaxonomyReferences(
                      value as TaxonomyReference[] | undefined,
                      context,
                      {
                        requireFilterable: true,
                      },
                    ),
                  ),
            }),
          ],

          preview: {
            select: {
              title: 'title',
              taxonomy: 'taxonomy',
              logic: 'logic',
            },

            prepare({title, taxonomy, logic}) {
              const count = Array.isArray(taxonomy) ? taxonomy.length : 0
              const selection = logic === 'radio' ? 'Single' : 'Multiple'

              return {
                title: title || 'Filter Group',
                subtitle: `${selection} · ${count} term${count === 1 ? '' : 's'}`,
              }
            },
          },
        }),
      ],

      validation: (Rule) =>
        Rule.custom((value) =>
          validateDocumentListTaxonomyFilterGroups(
            value as
              | {
                  _key?: string
                  title?: string
                  taxonomy?: TaxonomyReference[]
                }[]
              | undefined,
          ),
        ),
    }),

    /*
     * Legacy singular Taxonomy filter fields are retained in the schema so
     * existing Document Lists keep their stored configuration without a
     * migration. New authoring uses taxonomyFilterGroups above.
     */
    defineField({
      name: 'taxonomyFilterTitle',
      group: 'searchFilters',
      title: 'Legacy Taxonomy Filter Title',
      type: 'string',
      hidden: true,
    }),

    defineField({
      name: 'taxonomyFilterLogic',
      group: 'searchFilters',
      title: 'Legacy Taxonomy Filter Selection',
      type: 'string',
      hidden: true,
    }),

    defineField({
      name: 'taxonomyFilterMatchLogic',
      group: 'searchFilters',
      title: 'Legacy Taxonomy Match',
      type: 'string',
      hidden: true,
    }),

    defineField({
      name: 'filterTaxonomy',
      group: 'searchFilters',
      title: 'Legacy Taxonomy Filters',
      type: 'array',
      hidden: true,

      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'taxonomy'}],
        }),
      ],
    }),

    /* === Visitor Sorting === */

    defineField({
      name: 'enableSorting',
      group: 'sortingPagination',
      title: 'Enable Sorting',
      type: 'boolean',

      description: 'Allow visitors to change the order of the displayed results.',

      initialValue: false,
    }),

    defineField({
      name: 'standardSortOptions',
      group: 'sortingPagination',
      title: 'Standard Sort Options',
      type: 'array',

      description:
        'Select the common sort choices visitors should see. Labels are localized automatically from the page Locale.',

      initialValue: ['relevance', 'newest', 'oldest', 'title-asc', 'title-desc'],

      hidden: ({parent}) => !parent?.enableSorting,

      of: [
        defineArrayMember({
          type: 'string',
        }),
      ],

      options: {
        list: [
          {
            title: 'Relevance',
            value: 'relevance',
          },
          {
            title: 'Newest',
            value: 'newest',
          },
          {
            title: 'Oldest',
            value: 'oldest',
          },
          {
            title: 'Title A–Z',
            value: 'title-asc',
          },
          {
            title: 'Title Z–A',
            value: 'title-desc',
          },
        ],
      },

      validation: (Rule) => Rule.unique(),
    }),

    defineField({
      name: 'customSortOptions',
      group: 'sortingPagination',
      title: 'Custom Sort Options',
      type: 'array',

      description:
        'Add a special sort only when the standard options are not enough. Sort fields are intentionally restricted to supported document data.',

      hidden: ({parent}) => !parent?.enableSorting,

      of: [
        defineArrayMember({
          name: 'customSortOption',
          title: 'Custom Sort Option',
          type: 'object',

          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',

              description: 'Visitor-facing label for this custom sort option.',

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'field',
              title: 'Sort Field',
              type: 'string',

              options: {
                list: [
                  {
                    title: 'Published / Content Date',
                    value: 'date',
                  },
                  {
                    title: 'Title',
                    value: 'title',
                  },
                  {
                    title: 'Content Type',
                    value: 'content-type',
                  },
                  {
                    title: 'File Type',
                    value: 'file-type',
                  },
                ],
              },

              validation: (Rule) => Rule.required(),
            }),

            defineField({
              name: 'direction',
              title: 'Direction',
              type: 'string',

              initialValue: 'asc',

              options: {
                list: [
                  {
                    title: 'Ascending',
                    value: 'asc',
                  },
                  {
                    title: 'Descending',
                    value: 'desc',
                  },
                ],

                layout: 'radio',
              },

              validation: (Rule) => Rule.required(),
            }),
          ],

          preview: {
            select: {
              title: 'label',
              field: 'field',
              direction: 'direction',
            },

            prepare({title, field, direction}) {
              return {
                title: title || 'Custom Sort Option',
                subtitle: [field, direction].filter(Boolean).join(' · '),
              }
            },
          },
        }),
      ],
    }),

    /* Legacy sort items remain readable for existing content. */
    defineField({
      name: 'sortOptions',
      group: 'sortingPagination',
      title: 'Legacy Sort Options',
      type: 'array',
      hidden: true,

      of: [
        defineArrayMember({
          name: 'sortOption',
          title: 'Sort Option',
          type: 'object',

          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
            }),
            defineField({
              name: 'value',
              title: 'Sort Value',
              type: 'string',
            }),
          ],
        }),
      ],
    }),

    /* === Pagination === */

    defineField({
      name: 'enablePagination',
      group: 'sortingPagination',
      title: 'Enable Pagination',
      type: 'boolean',

      initialValue: true,
    }),

    defineField({
      name: 'itemsPerPage',
      group: 'sortingPagination',
      title: 'Items Per Page',
      type: 'number',

      initialValue: 9,

      hidden: ({parent}) => parent?.enablePagination === false,

      options: {
        list: [
          {
            title: '6',
            value: 6,
          },
          {
            title: '9',
            value: 9,
          },
          {
            title: '12',
            value: 12,
          },
          {
            title: '18',
            value: 18,
          },
          {
            title: '24',
            value: 24,
          },
        ],
      },

      validation: (Rule) => Rule.integer().min(1),
    }),

    /* === Empty State === */

    defineField({
      name: 'emptyStateText',
      group: 'content',
      title: 'Empty State Text',
      type: 'string',

      description: 'Displayed when no items match the current search or filters.',

      initialValue: 'No documents found matching your criteria.',
    }),

    defineField({
      name: 'styles',
      title: 'Block Styles',
      type: 'blockStyles',
      group: 'styles',

      description:
        'Optional shared presentation overrides for spacing, background, and content width.',
    }),
  ],

  preview: {
    select: {
      sourceMode: 'sourceMode',
      documents: 'documents',
      dynamicContentTypes: 'dynamicContentTypes',
      dynamicTaxonomy: 'dynamicTaxonomy',
    },

    prepare({sourceMode, documents, dynamicContentTypes, dynamicTaxonomy}) {
      const mode = sourceMode || 'manual'

      if (mode === 'dynamic') {
        const types = Array.isArray(dynamicContentTypes) ? dynamicContentTypes : []

        const taxonomyCount = Array.isArray(dynamicTaxonomy) ? dynamicTaxonomy.length : 0

        const typeLabel = types.length > 0 ? types.join(', ') : 'No content types'

        const taxonomyLabel =
          taxonomyCount > 0
            ? ` · ${taxonomyCount} taxonomy term${taxonomyCount === 1 ? '' : 's'}`
            : ''

        return {
          title: 'Document List',
          subtitle: `Dynamic · ${typeLabel}${taxonomyLabel}`,
        }
      }

      const count = Array.isArray(documents) ? documents.length : 0

      return {
        title: 'Document List',
        subtitle: `Manual · ${count} item${count === 1 ? '' : 's'}`,
      }
    },
  },
})
