import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import { IMAGE_FRAGMENT } from "../image";

import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

const FORM_FIELD_FRAGMENT = `
  _key,
  _type,

  name,
  colSpan,

  label,
  placeholder,
  helperText,

  required,
  disabled,

  defaultValue,
  defaultValues,

  type,
  autoComplete,

  minLength,
  maxLength,
  pattern,

  min,
  max,
  step,

  size,
  sizeVariant,

  autoGrow,
  rows,

  value,
  defaultChecked,

  multiple,
  accept,
  maxSizeMb,

  description,
  labelPlacement,

  showValue,

  minDate,
  maxDate,

  legend,
  variant,

  options[] {
    _key,
    _type,

    label,
    value,
    helperText,
    disabled
  }
`;

export const FORM_BLOCK_FRAGMENT = `
  _type == "formBlock" => {
    styles {
      ${BLOCK_STYLES_FRAGMENT}
    },

    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    layout,
    alignment,
    formPosition,

    image {
      ${IMAGE_FRAGMENT}
    },

    formMode,

    fields[] {
      ${FORM_FIELD_FRAGMENT},

      fields[] {
        ${FORM_FIELD_FRAGMENT}
      }
    },

    steps[] {
      _key,
      _type,

      title,
      description,

      fields[] {
        ${FORM_FIELD_FRAGMENT},

        fields[] {
          ${FORM_FIELD_FRAGMENT}
        }
      }
    },

    showProgress,

    nextButtonText,
    previousButtonText,

    submitButtonText,
    submitButtonVariant,
    submitButtonSize,
    submitButtonIcon,
    submitButtonIconAlignment,

    formKey
  }
`;
