import {defineArrayMember, defineField, defineType} from 'sanity'
import {createAccessibleImageFields} from './accessibleImageFields'
import {validateUniqueWebUrls, validateWebUrl} from '../validation/webUrls'

export const organizationStructuredDataType = defineType({
  name: 'organizationStructuredData',
  title: 'Organization',
  type: 'object',

  fields: [
    defineField({
      name: 'name',
      title: 'Organization Name',
      type: 'string',
      description:
        'Public organization/brand name used in structured data. Leave blank to fall back to the Site Name.',
    }),

    defineField({
      name: 'legalName',
      title: 'Legal Name',
      type: 'string',
      description:
        'Optional registered/legal organization name when different from the public brand name.',
    }),

    defineField({
      name: 'description',
      title: 'Organization Description',
      type: 'text',
      rows: 3,
      description:
        'Short factual description of the organization. This is used only for structured data.',
      validation: (rule) => rule.max(500),
    }),

    defineField({
      name: 'logo',
      title: 'Organization Logo',
      type: 'image',
      fields: createAccessibleImageFields('Organization logo'),
      description: 'Primary organization logo used by structured data consumers.',
      options: {
        hotspot: true,
      },
    }),

    defineField({
      name: 'sameAs',
      title: 'Identity / Social URLs',
      type: 'array',
      description:
        'Official profiles or pages that identify the same organization, such as LinkedIn, YouTube, Instagram, Facebook, or X.',
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
      name: 'contactPoints',
      title: 'Contact Points',
      type: 'array',
      description:
        'Optional structured contact information such as customer service, sales, or technical support.',
      of: [
        defineArrayMember({
          type: 'organizationContactPoint',
        }),
      ],
    }),

    defineField({
      name: 'address',
      title: 'Organization Address',
      type: 'organizationAddress',
      description: 'Optional primary postal address for the organization.',
    }),
  ],

  preview: {
    select: {
      name: 'name',
      legalName: 'legalName',
      media: 'logo',
    },

    prepare({name, legalName, media}) {
      return {
        title: name || legalName || 'Organization',
        subtitle: legalName && legalName !== name ? legalName : undefined,
        media,
      }
    },
  },
})
