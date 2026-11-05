import {defineField, defineType} from 'sanity'

export const organizationAddressType = defineType({
  name: 'organizationAddress',
  title: 'Organization Address',
  type: 'object',

  fields: [
    defineField({
      name: 'streetAddress',
      title: 'Street Address',
      type: 'string',
    }),

    defineField({
      name: 'addressLocality',
      title: 'City / Locality',
      type: 'string',
    }),

    defineField({
      name: 'addressRegion',
      title: 'State / Region',
      type: 'string',
    }),

    defineField({
      name: 'postalCode',
      title: 'Postal Code',
      type: 'string',
    }),

    defineField({
      name: 'addressCountry',
      title: 'Country Code',
      type: 'string',
      description: 'Two-letter ISO country code, for example US, CA, GB, or AU.',
      validation: (rule) =>
        rule
          .regex(/^[A-Za-z]{2}$/, {
            name: 'ISO country code',
          })
          .warning('Use a two-letter country code such as US, CA, GB, or AU.'),
    }),
  ],

  preview: {
    select: {
      street: 'streetAddress',
      city: 'addressLocality',
      region: 'addressRegion',
      country: 'addressCountry',
    },

    prepare({street, city, region, country}) {
      return {
        title: street || 'Organization Address',
        subtitle: [city, region, country].filter(Boolean).join(', '),
      }
    },
  },
})
