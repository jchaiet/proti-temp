import {defineArrayMember, defineField, defineType} from 'sanity'
import {portableTextToPlainText} from '../../lib/portableText'
import {createAccessibleImageFields} from '../objects/accessibleImageFields'
import {validateSingleFormFields, validateSteppedFormSteps} from '../forms/validation'
import {getFormWebhookDestinationOptions} from '../forms/webhookDestinations'

export const formBlockType = defineType({
  name: 'formBlock',
  title: 'Form',
  type: 'object',

  groups: [
    {
      name: 'contentLayout',
      title: 'Content & Layout',
      default: true,
    },
    {
      name: 'formFields',
      title: 'Form Fields',
    },
    {
      name: 'behavior',
      title: 'Behavior',
    },
    {
      name: 'submitButton',
      title: 'Submit Button',
    },
    {
      name: 'styles',
      title: 'Styles',
    },
  ],

  fields: [
    defineField({
      name: 'heading',
      group: 'contentLayout',
      title: 'Heading',
      type: 'sectionHeading',
    }),

    defineField({
      name: 'layout',
      group: 'contentLayout',
      title: 'Layout',
      type: 'string',

      description: 'Controls how the form, heading, and optional side image are arranged.',

      initialValue: 'default',

      options: {
        list: [
          {
            title: 'Default',
            value: 'default',
          },
          {
            title: 'Split 50 / 50',
            value: 'split',
          },
          {
            title: 'Split 35 / 65',
            value: 'split-35-65',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'alignment',
      group: 'contentLayout',
      title: 'Content Alignment',
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
    }),

    defineField({
      name: 'formPosition',
      group: 'contentLayout',
      title: 'Form Position',
      type: 'string',

      description: 'Choose whether the form appears before or after the supporting content.',

      initialValue: 'right',

      options: {
        list: [
          {
            title: 'Left',
            value: 'left',
          },
          {
            title: 'Right',
            value: 'right',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'image',
      group: 'contentLayout',
      title: 'Side Image',
      type: 'image',

      description: 'Optional supporting image displayed beside the form content.',

      options: {
        hotspot: true,
      },

      fields: createAccessibleImageFields('Image'),
    }),

    defineField({
      name: 'submitButtonText',
      group: 'submitButton',

      title: 'Submit Button Text',

      type: 'string',

      initialValue: 'Submit',

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'submitButtonVariant',
      group: 'submitButton',

      title: 'Submit Button Style',

      type: 'string',

      initialValue: 'primary',

      options: {
        list: [
          {
            title: 'Primary',
            value: 'primary',
          },
          {
            title: 'Secondary',
            value: 'secondary',
          },
          {
            title: 'Glass',
            value: 'glass',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'submitButtonSize',
      group: 'submitButton',

      title: 'Submit Button Size',

      type: 'string',

      initialValue: 'md',

      options: {
        list: [
          {
            title: 'Small',
            value: 'sm',
          },
          {
            title: 'Medium',
            value: 'md',
          },
          {
            title: 'Large',
            value: 'lg',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'submitButtonIcon',
      group: 'submitButton',

      title: 'Submit Button Icon',

      type: 'iconPicker',
    }),

    defineField({
      name: 'submitButtonIconAlignment',
      group: 'submitButton',

      title: 'Icon Position',

      type: 'string',

      initialValue: 'right',

      hidden: ({parent}) => !parent?.submitButtonIcon,

      options: {
        list: [
          {
            title: 'Left',
            value: 'left',
          },
          {
            title: 'Right',
            value: 'right',
          },
        ],

        layout: 'radio',
      },
    }),

    defineField({
      name: 'formMode',
      group: 'formFields',
      title: 'Form Type',
      type: 'string',

      description:
        'Use Single Page for one continuous form or Stepped Form for a guided multi-step flow.',

      initialValue: 'single',

      options: {
        list: [
          {
            title: 'Single Page',
            value: 'single',
          },
          {
            title: 'Stepped Form',
            value: 'stepped',
          },
        ],

        layout: 'radio',
      },

      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'steps',
      group: 'formFields',
      title: 'Steps',
      type: 'array',

      description: 'Add and order the steps in this guided form.',

      hidden: ({parent}) => parent?.formMode !== 'stepped',

      of: [
        defineArrayMember({
          type: 'formStep',
        }),
      ],

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                formMode?: string
              }
            | undefined

          if (parent?.formMode !== 'stepped') {
            return true
          }

          if (!Array.isArray(value) || value.length < 2) {
            return 'A stepped form must contain at least two steps.'
          }

          return validateSteppedFormSteps(value)
        }),
    }),

    defineField({
      name: 'nextButtonText',
      group: 'behavior',
      title: 'Next Button Text',
      type: 'string',

      initialValue: 'Next',

      hidden: ({parent}) => parent?.formMode !== 'stepped',
    }),

    defineField({
      name: 'previousButtonText',
      group: 'behavior',
      title: 'Previous Button Text',
      type: 'string',

      initialValue: 'Previous',

      hidden: ({parent}) => parent?.formMode !== 'stepped',
    }),

    defineField({
      name: 'showProgress',
      group: 'behavior',
      title: 'Show Progress',
      type: 'boolean',

      description: 'Show visitors their progress through a stepped form.',

      initialValue: true,

      hidden: ({parent}) => parent?.formMode !== 'stepped',
    }),

    defineField({
      name: 'fields',
      group: 'formFields',
      title: 'Fields',
      type: 'array',

      description: 'Add and order the fields in this single-page form.',

      hidden: ({parent}) => parent?.formMode === 'stepped',

      of: [
        defineArrayMember({
          type: 'formInputField',
        }),

        defineArrayMember({
          type: 'formTextareaField',
        }),

        defineArrayMember({
          type: 'formCheckboxField',
        }),

        defineArrayMember({
          type: 'formDatePickerField',
        }),

        defineArrayMember({
          type: 'formCalendarField',
        }),

        defineArrayMember({
          type: 'formFileUploadField',
        }),

        defineArrayMember({
          type: 'formRadioGroupField',
        }),

        defineArrayMember({
          type: 'formRangeField',
        }),

        defineArrayMember({
          type: 'formSelectField',
        }),

        defineArrayMember({
          type: 'formSwitchField',
        }),

        defineArrayMember({
          type: 'formFieldset',
        }),

        defineArrayMember({
          type: 'formDividerField',
        }),

        defineArrayMember({
          type: 'formSpacerField',
        }),

        defineArrayMember({
          type: 'formHiddenField',
        }),
      ],

      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as
            | {
                formMode?: string
              }
            | undefined

          if (parent?.formMode === 'stepped') {
            return true
          }

          return validateSingleFormFields(value)
        }),
    }),

    defineField({
      name: 'completionAction',
      title: 'After Successful Submission',
      group: 'behavior',
      type: 'string',
      description:
        'Replace the form with a confirmation, or redirect to a dedicated thank-you page.',
      initialValue: 'message',
      options: {
        list: [
          {title: 'Show Confirmation (Hide Form)', value: 'message'},
          {title: 'Redirect to Page', value: 'redirect'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'successTitle',
      title: 'Confirmation Heading',
      group: 'behavior',
      type: 'string',
      description: 'Optional. Defaults to "Thank you!" (localized by the website).',
      hidden: ({parent}) => parent?.completionAction === 'redirect',
    }),

    defineField({
      name: 'successMessage',
      title: 'Confirmation Message',
      group: 'behavior',
      type: 'text',
      rows: 3,
      description: 'Optional. Displayed instead of the form after a successful submission.',
      hidden: ({parent}) => parent?.completionAction === 'redirect',
    }),

    defineField({
      name: 'successRedirectPath',
      title: 'Thank-you Page Path',
      group: 'behavior',
      type: 'string',
      description:
        'Internal, published page URL path, e.g. /thank-you or /us-es/gracias. Do not enter a full URL.',
      hidden: ({parent}) => parent?.completionAction !== 'redirect',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {completionAction?: string} | undefined
          if (parent?.completionAction !== 'redirect') return true
          if (typeof value !== 'string' || !value.trim()) {
            return 'A thank-you page path is required for redirects.'
          }
          const path = value.trim()
          if (!path.startsWith('/') || path.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(path)) {
            return 'Enter a same-site path beginning with one slash, such as /thank-you.'
          }
          return true
        }),
    }),

    defineField({
      name: 'webhookDestination',
      group: 'behavior',
      title: 'Webhook Destination',
      type: 'string',
      description:
        'Where this form is delivered. Destinations are approved by the website configuration; webhook URLs and secrets are never stored in Sanity.',
      initialValue: 'default',
      options: {
        list: getFormWebhookDestinationOptions(
          process.env.SANITY_STUDIO_FORM_WEBHOOK_DESTINATIONS ?? '',
        ),
      },
    }),

    /*
     * This identifies which frontend/backend
     * form handler receives the submission.
     */
    defineField({
      name: 'formKey',
      group: 'behavior',
      title: 'Form Key',
      type: 'slug',

      description:
        'Stable internal identifier used by the website to route this form submission. It is not shown to visitors.',

      options: {
        source: 'heading.title',
      },

      validation: (Rule) => Rule.required(),
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
      title: 'heading.title',

      formMode: 'formMode',

      fields: 'fields',

      steps: 'steps',

      media: 'image',
    },

    prepare({title, formMode, fields, steps, media}) {
      const headingTitle = portableTextToPlainText(title)

      const isStepped = formMode === 'stepped'
      const previewItems = isStepped ? steps : fields
      const count = Array.isArray(previewItems) ? previewItems.length : 0
      const itemLabel = isStepped ? 'step' : 'field'

      return {
        title: headingTitle || 'Form',

        subtitle: `${count} ${itemLabel}${count === 1 ? '' : 's'}`,

        media,
      }
    },
  },
})
