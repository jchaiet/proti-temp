import {defineArrayMember, defineField, defineType} from 'sanity'
import {validateWebUrl} from '../validation/webUrls'

export const organizationContactPointType = defineType({
  name: 'organizationContactPoint',
  title: 'Contact Point',
  type: 'object',

  fields: [
    defineField({
      name: 'contactType',
      title: 'Contact Type',
      type: 'string',
      description:
        'Purpose of this contact, for example customer service, sales, technical support, or reservations.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'telephone',
      title: 'Telephone',
      type: 'string',
      description: 'Prefer an international format such as +1-800-555-1234.',
    }),

    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (rule) => rule.email(),
    }),

    defineField({
      name: 'url',
      title: 'Contact URL',
      type: 'url',
      description: 'Optional support/contact page URL.',
      validation: (rule) =>
        rule
          .uri({
            scheme: ['http', 'https'],
          })
          .custom((value) => validateWebUrl(value, 'Contact URL')),
    }),

    defineField({
      name: 'areaServed',
      title: 'Area Served',
      type: 'array',
      description:
        'Optional markets or regions served by this contact, for example US, Canada, North America, or Worldwide.',
      of: [
        defineArrayMember({
          type: 'string',
        }),
      ],
      validation: (rule) => rule.unique(),
    }),

    defineField({
      name: 'availableLanguages',
      title: 'Available Languages',
      type: 'array',
      description: 'Optional languages supported by this contact, for example English or Spanish.',
      of: [
        defineArrayMember({
          type: 'string',
        }),
      ],
      validation: (rule) => rule.unique(),
    }),
  ],

  validation: (rule) =>
    rule.custom((value) => {
      if (!value || typeof value !== 'object') {
        return true
      }

      const contact = value as {
        telephone?: string
        email?: string
        url?: string
      }

      return contact.telephone || contact.email || contact.url
        ? true
        : 'Add at least one Telephone, Email, or Contact URL.'
    }),

  preview: {
    select: {
      contactType: 'contactType',
      telephone: 'telephone',
      email: 'email',
    },

    prepare({contactType, telephone, email}) {
      return {
        title: contactType || 'Contact Point',
        subtitle: telephone || email,
      }
    },
  },
})
