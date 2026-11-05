import {defineField} from 'sanity'

import {validateImageAlt} from '../validation/imageAccessibility'

const DEFAULT_DESCRIPTION =
  'Describe the meaningful content of the image for people who cannot see it.'

export function createAccessibleImageFields(label = 'Image', description = DEFAULT_DESCRIPTION) {
  return [
    defineField({
      name: 'alt',
      title: 'Alternative Text',
      type: 'string',
      description,
      validation: (rule) =>
        rule.max(160).custom((value, context) => validateImageAlt(value, context, label)),
    }),
  ]
}
