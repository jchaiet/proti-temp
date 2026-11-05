import {defineField, defineType} from 'sanity'

import {validateWebUrl} from '../validation/webUrls'

export const authorCredentialType = defineType({
  name: 'authorCredential',
  title: 'Credential',
  type: 'object',

  fields: [
    defineField({
      name: 'name',
      title: 'Credential Name',
      type: 'string',
      description:
        'Formal credential, certification, license, degree, or professional designation.',
      validation: (rule) => rule.required().max(200),
    }),

    defineField({
      name: 'category',
      title: 'Credential Type',
      type: 'string',
      description: 'Optional category such as Certification, License, Degree, or Registration.',
      validation: (rule) => rule.max(120),
    }),

    defineField({
      name: 'identifier',
      title: 'Credential Identifier',
      type: 'string',
      description:
        'Optional public credential or license identifier. Do not store private account numbers or sensitive identifiers.',
      validation: (rule) => rule.max(160),
    }),

    defineField({
      name: 'recognizedBy',
      title: 'Issuing / Recognizing Organization',
      type: 'string',
      description: 'Organization that issued, recognizes, or verifies this credential.',
      validation: (rule) => rule.max(200),
    }),

    defineField({
      name: 'url',
      title: 'Credential URL',
      type: 'url',
      description: 'Optional public page that verifies or describes this credential.',
      validation: (rule) =>
        rule
          .uri({
            scheme: ['http', 'https'],
          })
          .custom((value) => validateWebUrl(value, 'Credential URL')),
    }),
  ],

  preview: {
    select: {
      title: 'name',
      category: 'category',
      recognizedBy: 'recognizedBy',
    },

    prepare({title, category, recognizedBy}) {
      return {
        title: title || 'Credential',
        subtitle: [category, recognizedBy].filter(Boolean).join(' • '),
      }
    },
  },
})
