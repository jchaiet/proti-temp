import {defineField, defineType} from 'sanity'

import {
  formFieldDisabledField,
  formFieldNameField,
  formFieldRequiredField,
  formFieldWidthField,
} from './shared'

export const formFileUploadFieldType = defineType({
  name: 'formFileUploadField',
  title: 'File Upload',
  type: 'object',
  description:
    'Requires a dedicated file-storage submission adapter. The default Proti webhook adapter does not accept file attachments.',

  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
    }),

    formFieldNameField(),

    defineField({
      name: 'helperText',
      title: 'Helper Text',
      type: 'string',
    }),

    defineField({
      name: 'accept',
      title: 'Accepted File Types',
      type: 'string',

      description:
        'Comma-separated MIME types or extensions, for example ".pdf,.doc,.docx" or "image/*".',
    }),

    defineField({
      name: 'multiple',
      title: 'Allow Multiple Files',
      type: 'boolean',

      initialValue: false,
    }),

    defineField({
      name: 'maxSizeMb',
      title: 'Maximum File Size',
      type: 'number',

      description: 'Maximum allowed size for each uploaded file, in MB.',

      validation: (Rule) => Rule.min(1),
    }),

    formFieldRequiredField(),

    formFieldDisabledField(),

    formFieldWidthField(),
  ],

  preview: {
    select: {
      label: 'label',
      name: 'name',
      multiple: 'multiple',
    },

    prepare({label, name, multiple}) {
      return {
        title: label || name || 'File Upload',

        subtitle: `${multiple ? 'Multiple Files' : 'Single File'}${name ? ` · ${name}` : ''}`,
      }
    },
  },
})
