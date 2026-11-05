import type { CmsIcon } from "../icon";
import type { CmsImage } from "../image";
import type { CmsSectionHeading } from "../section-heading";
import type { PortableTextBlock } from "@portabletext/types";

export type CmsFormLayout = "default" | "split" | "split-35-65";

export type CmsFormAlignment = "left" | "center" | "right";

export type CmsFormPosition = "left" | "right";

export type CmsFormColumnSpan = 1 | 2;

export interface CmsFormFieldBase {
  _key: string;
  name: string;

  colSpan?: CmsFormColumnSpan;
}

export interface CmsFormInteractiveFieldBase extends CmsFormFieldBase {
  required?: boolean;
  disabled?: boolean;
}

export interface CmsFormInputField extends CmsFormInteractiveFieldBase {
  _type: "formInputField";
  label?: string;
  type?: "text" | "email" | "tel" | "url" | "number" | "password" | "search";
  placeholder?: string;
  helperText?: string;
  defaultValue?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
  sizeVariant?: "sm" | "md" | "lg";
}

export interface CmsFormStep {
  _key: string;
  _type: "formStep";
  title?: string;
  description?: PortableTextBlock[];
  fields?: CmsFormField[];
}

/**
 * Textarea
 */
export interface CmsFormTextareaField extends CmsFormInteractiveFieldBase {
  _type: "formTextareaField";

  label?: string;

  placeholder?: string;

  helperText?: string;

  defaultValue?: string;

  rows?: number;

  minLength?: number;

  maxLength?: number;

  autoGrow?: boolean;

  size?: "sm" | "md" | "lg";
}

/**
 * Checkbox
 */
export interface CmsFormCheckboxField extends CmsFormInteractiveFieldBase {
  _type: "formCheckboxField";

  label?: string;

  helperText?: string;

  value?: string;

  defaultChecked?: boolean;
}

/**
 * Native date input
 */
export interface CmsFormDatePickerField extends CmsFormInteractiveFieldBase {
  _type: "formDatePickerField";

  label?: string;

  helperText?: string;

  min?: string;

  max?: string;

  size?: "sm" | "md" | "lg";
}

/**
 * Full calendar UI
 */
export interface CmsFormCalendarField extends CmsFormInteractiveFieldBase {
  _type: "formCalendarField";

  label?: string;

  helperText?: string;

  defaultValue?: string;

  minDate?: string;

  maxDate?: string;
}

/**
 * File upload
 */
export interface CmsFormFileUploadField extends CmsFormInteractiveFieldBase {
  _type: "formFileUploadField";

  label?: string;

  helperText?: string;

  accept?: string;

  multiple?: boolean;

  /**
   * CMS stores MB for editor convenience.
   * Mapper converts this to bytes.
   */
  maxSizeMb?: number;
}

/**
 * Radio option
 */
export interface CmsFormRadioOption {
  _key: string;

  _type?: "formRadioOption";

  label: string;

  value: string;

  helperText?: string;

  disabled?: boolean;
}

/**
 * Radio group
 */
export interface CmsFormRadioGroupField extends CmsFormFieldBase {
  _type: "formRadioGroupField";

  label?: string;

  defaultValue?: string;

  required?: boolean;

  options?: CmsFormRadioOption[];
}

/**
 * Range
 */
export interface CmsFormRangeField extends CmsFormInteractiveFieldBase {
  _type: "formRangeField";

  label?: string;

  helperText?: string;

  min?: number;

  max?: number;

  step?: number;

  defaultValue?: number;

  showValue?: boolean;
}

/**
 * Select option
 */
export interface CmsFormSelectOption {
  _key: string;

  _type?: "formSelectOption";

  label: string;

  value: string;
}

/**
 * Select
 */
export interface CmsFormSelectField extends CmsFormInteractiveFieldBase {
  _type: "formSelectField";

  label?: string;

  placeholder?: string;

  helperText?: string;

  options?: CmsFormSelectOption[];

  multiple?: boolean;

  defaultValue?: string;

  defaultValues?: string[];

  size?: "sm" | "md" | "lg";
}

/**
 * Switch
 */
export interface CmsFormSwitchField extends CmsFormInteractiveFieldBase {
  _type: "formSwitchField";

  label?: string;

  description?: string;

  value?: string;

  defaultChecked?: boolean;

  sizeVariant?: "sm" | "md" | "lg";

  labelPlacement?: "start" | "end";
}

/**
 * Fieldset
 */
export interface CmsFormFieldset {
  _key: string;

  _type: "formFieldset";

  /**
   * Internal identifier used by FormBlock
   * for rendering keys/config.
   */
  name: string;

  colSpan?: CmsFormColumnSpan;

  legend: string;

  description?: string;

  variant?: "standard" | "bordered";

  size?: "sm" | "md" | "lg";

  disabled?: boolean;

  fields?: CmsFormField[];
}

/**
 * Hidden input
 */
export interface CmsFormHiddenField {
  _key: string;

  _type: "formHiddenField";

  name: string;

  value: string;
}

/**
 * Union used by FormBlock fields[]
 */
export type CmsFormField =
  | CmsFormInputField
  | CmsFormTextareaField
  | CmsFormCheckboxField
  | CmsFormDatePickerField
  | CmsFormCalendarField
  | CmsFormFileUploadField
  | CmsFormRadioGroupField
  | CmsFormRangeField
  | CmsFormSelectField
  | CmsFormSwitchField
  | CmsFormFieldset
  | CmsFormHiddenField;

/**
 * FormBlock
 */
export interface CmsFormBlock {
  _key: string;

  _type: "formBlock";

  heading?: CmsSectionHeading;

  layout?: CmsFormLayout;

  alignment?: CmsFormAlignment;

  formPosition?: CmsFormPosition;

  image?: CmsImage;

  submitButtonText?: string;

  submitButtonVariant?: "primary" | "secondary" | "glass";

  submitButtonSize?: "sm" | "md" | "lg";

  submitButtonIcon?: CmsIcon;

  submitButtonIconAlignment?: "left" | "right";

  formMode?: "single" | "stepped";

  steps?: CmsFormStep[];

  showProgress?: boolean;

  nextButtonText?: string;

  previousButtonText?: string;

  fields?: CmsFormField[];

  formKey?: {
    current?: string;
  };

  /** What happens after the API confirms that the form was submitted. */
  completionAction?: "message" | "redirect";
  successTitle?: string;
  successMessage?: string;
  /** Absolute path on the current site; never an external URL. */
  successRedirectPath?: string;
}
