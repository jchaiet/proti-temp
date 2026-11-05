import {defineArrayMember, defineField, defineType} from 'sanity'

import {AuthorTranslationsInput} from '../../components/inputs/AuthorTranslationsInput'
import {validateUniqueAuthorSlug} from '../validation/authorSlug'
import {validateSiteTranslations} from '../validation/siteTranslations'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'
import {type ImageValue, validateImageAltForImage} from '../validation/imageAccessibility'
import {validateUniqueWebUrls, validateWebUrl} from '../validation/webUrls'
import {validateAuthorBioHeadingQuality} from '../validation/headingQuality'

export const authorType = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',

  validation: (rule) =>
    rule
      .custom((document, context) => validateUniqueAuthorSlug(document, context))
      .custom((document, context) =>
        validateSiteTranslations(document, context, {
          documentLabel: 'Author',
          baseFieldsLabel: 'base Author fields',
        }),
      ),

  groups: [
    {
      name: 'profile',
      title: 'Profile',
      default: true,
    },
    {
      name: 'expertise',
      title: 'Expertise & Credentials',
    },
    {
      name: 'translations',
      title: 'Translations',
    },
    {
      name: 'routing',
      title: 'Site & Identity',
    },
  ],

  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'profile',
      description:
        'Author name for the Site default Locale. Add localized display names in Translations if needed.',
      validation: (rule) => rule.required().max(160),
    }),

    defineField({
      name: 'bioRichText',
      title: 'Bio',
      type: 'richText',
      group: 'profile',
      description:
        'Author biography for the Site default Locale. Supports formatted text, links, and lists. The Author name is already the page H1, so use H2-H6 for Bio headings.',
      validation: (rule) =>
        rule.custom((value) => validateAuthorBioHeadingQuality(value)).warning(),
    }),

    defineField({
      name: 'image',
      title: 'Profile Image',
      type: 'image',
      fields: createAccessibleImageFields(
        'Profile image',
        'Alternative text for the Site default Locale.',
      ),
      group: 'profile',
      options: {
        hotspot: true,
      },
    }),

    defineField({
      name: 'jobTitle',
      title: 'Job Title',
      type: 'string',
      group: 'profile',
      description:
        'Professional title for the Site default Locale, for example Senior Editor or Registered Dietitian.',
      validation: (rule) => rule.max(200),
    }),

    defineField({
      name: 'expertise',
      title: 'Areas of Expertise',
      type: 'array',
      group: 'expertise',
      description:
        'Topics this Author is qualified to write or review. Use the Site default Locale here and localized labels in Translations.',
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) => rule.required().max(160),
        }),
      ],
      validation: (rule) => rule.unique(),
    }),

    defineField({
      name: 'credentials',
      title: 'Credentials',
      type: 'array',
      group: 'expertise',
      description:
        'Public professional credentials, certifications, licenses, degrees, or registrations that support this Author’s expertise.',
      of: [
        defineArrayMember({
          type: 'authorCredential',
        }),
      ],
    }),

    defineField({
      name: 'affiliationName',
      title: 'Affiliation',
      type: 'string',
      group: 'expertise',
      description:
        'Optional organization, institution, practice, or employer this Author is affiliated with.',
      validation: (rule) => rule.max(200),
    }),

    defineField({
      name: 'affiliationUrl',
      title: 'Affiliation URL',
      type: 'url',
      group: 'expertise',
      description: 'Optional public URL for the affiliated organization.',
      validation: (rule) =>
        rule
          .uri({
            scheme: ['http', 'https'],
          })
          .custom((value) => validateWebUrl(value, 'Affiliation URL')),
    }),

    defineField({
      name: 'profileUrl',
      title: 'Profile URL',
      type: 'url',
      group: 'profile',
      description:
        'Optional public profile URL shared across locales. Leave blank until a real public author profile exists.',
      validation: (rule) =>
        rule
          .uri({
            scheme: ['http', 'https'],
          })
          .custom((value) => validateWebUrl(value, 'Profile URL')),
    }),

    defineField({
      name: 'sameAs',
      title: 'Identity / Social URLs',
      type: 'array',
      group: 'profile',
      description:
        'Official URLs that identify the same person, such as LinkedIn or another professional profile. Shared across locales.',
      of: [
        defineArrayMember({
          type: 'url',
          validation: (rule) =>
            rule
              .uri({
                scheme: ['http', 'https'],
              })
              .custom((value) => validateWebUrl(value, 'Identity / Social URL')),
        }),
      ],
      validation: (rule) =>
        rule.unique().custom((values) => validateUniqueWebUrls(values as string[] | undefined)),
    }),

    defineField({
      name: 'translations',
      title: 'Translations',
      type: 'array',
      group: 'translations',
      description:
        'Locale-specific Author display fields. Locales are generated automatically from the selected Site.',

      components: {
        input: AuthorTranslationsInput,
      },

      of: [
        defineArrayMember({
          name: 'authorTranslation',
          title: 'Author Translation',
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
              name: 'name',
              title: 'Name',
              type: 'string',
              validation: (rule) => rule.max(160),
            }),

            defineField({
              name: 'jobTitle',
              title: 'Job Title',
              type: 'string',
              validation: (rule) => rule.max(200),
            }),

            defineField({
              name: 'expertise',
              title: 'Areas of Expertise',
              type: 'array',
              description: 'Localized expertise labels for this Locale.',
              of: [
                defineArrayMember({
                  type: 'string',
                  validation: (rule) => rule.required().max(160),
                }),
              ],
              validation: (rule) => rule.unique(),
            }),

            defineField({
              name: 'bioRichText',
              title: 'Bio',
              type: 'richText',
              description:
                'Localized biography. Supports formatted text, links, and lists. The Author name is already the page H1, so use H2-H6 for Bio headings.',
              validation: (rule) =>
                rule.custom((value) => validateAuthorBioHeadingQuality(value)).warning(),
            }),

            defineField({
              name: 'imageAlt',
              title: 'Profile Image Alternative Text',
              type: 'string',
              validation: (rule) =>
                rule
                  .max(160)
                  .custom((value, context) =>
                    validateImageAltForImage(
                      value,
                      context.document?.image as ImageValue | undefined,
                      'Profile image',
                    ),
                  ),
            }),
          ],

          preview: {
            select: {
              name: 'name',
              locale: 'locale',
              jobTitle: 'jobTitle',
            },

            prepare({name, locale, jobTitle}) {
              return {
                title: name || locale || 'Author Translation',
                subtitle: [locale, jobTitle].filter(Boolean).join(' • '),
              }
            },
          },
        }),
      ],
    }),

    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'routing',
      description: 'Website this Author belongs to.',
      to: [{type: 'site'}],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'URL Segment',
      type: 'slug',
      group: 'routing',
      description: 'Public Author URL segment shared across locales. Example: /authors/jane-smith',

      options: {
        source: 'name',
        maxLength: 96,

        /*
         * Disable Sanity's built-in global slug uniqueness check.
         *
         * Author slug uniqueness is Site-scoped and is enforced by the
         * document-level validateUniqueAuthorSlug(...) validator above.
         */
        isUnique: () => true,
      },

      validation: (rule) =>
        rule.required().custom((slug) => {
          const value = slug?.current

          if (!value) {
            return true
          }

          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
            return 'URL Segment may only contain lowercase letters, numbers, and hyphens.'
          }

          return true
        }),
    }),
  ],

  orderings: [
    {
      title: 'Name, A–Z',
      name: 'nameAsc',
      by: [{field: 'name', direction: 'asc'}],
    },
  ],

  preview: {
    select: {
      title: 'name',
      jobTitle: 'jobTitle',
      site: 'site.name',
      media: 'image',
      translations: 'translations',
    },

    prepare({title, jobTitle, site, media, translations}) {
      const translationCount = Array.isArray(translations) ? translations.length : 0

      return {
        title: title || 'Untitled Author',

        subtitle: [
          jobTitle,
          site,
          translationCount > 0
            ? `${translationCount} translation${translationCount === 1 ? '' : 's'}`
            : undefined,
        ]
          .filter(Boolean)
          .join(' • '),

        media,
      }
    },
  },
})
