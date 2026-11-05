import type {
  FormBlockProps,
  FormFieldConfig,
  FormStep,
} from "mino-ui/blocks/FormBlock";

import type { CmsFormBlock, CmsFormField, CmsIcon } from "@/cms/types";

import { mapSectionHeading } from "@/cms/mappers/section-heading";
import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";

import { SANITY_RESPONSIVE_WIDTHS } from "@/cms/resolvers/image-widths";
import { CmsRichText } from "@/components/CmsRichText";

export type MappedFormBlockProps = Omit<FormBlockProps, "onSubmit"> & {
  formKey: string;
  blockKey: string;
  submitButtonIconName?: CmsIcon;
  completionAction?: "message" | "redirect";
  successRedirectPath?: string;
};

function mapFormSteps(steps: CmsFormBlock["steps"] | undefined): FormStep[] {
  if (!steps?.length) {
    return [];
  }

  return steps.map((step) => ({
    id: step._key,

    title: step.title,

    description: step.description?.length ? (
      <CmsRichText value={step.description} mode="block" />
    ) : undefined,

    fields: mapFormFields(step.fields),
  }));
}

function mapFormField(field: CmsFormField): FormFieldConfig | null {
  switch (field._type) {
    case "formInputField":
      return {
        fieldType: "input",
        name: field.name,
        colSpan: field.colSpan ?? 2,
        label: field.label,
        type: field.type ?? "text",
        placeholder: field.placeholder,
        helperText: field.helperText,
        defaultValue: field.defaultValue,
        autoComplete: field.autoComplete,
        minLength: field.minLength,
        maxLength: field.maxLength,
        pattern: field.pattern,
        min: field.min,
        max: field.max,
        step: field.step,
        sizeVariant: field.sizeVariant ?? "md",
        required: field.required ?? false,
        disabled: field.disabled ?? false,
      };

    case "formTextareaField":
      return {
        fieldType: "textarea",
        name: field.name,
        colSpan: field.colSpan ?? 2,
        label: field.label,
        placeholder: field.placeholder,
        helperText: field.helperText,
        defaultValue: field.defaultValue ?? undefined,
        rows: field.rows ?? 3,
        minLength: field.minLength,
        maxLength: field.maxLength,
        autoGrow: field.autoGrow ?? false,
        size: field.size ?? "md",
        required: field.required ?? false,
        disabled: field.disabled ?? false,
      };

    case "formCheckboxField":
      return {
        fieldType: "checkbox",
        name: field.name,
        colSpan: field.colSpan ?? 2,
        label: field.label,
        helperText: field.helperText,
        value: field.value ?? "on",
        defaultChecked: field.defaultChecked ?? false,
        required: field.required ?? false,
        disabled: field.disabled ?? false,
      };

    case "formDatePickerField":
      return {
        fieldType: "datepicker",
        name: field.name,
        colSpan: field.colSpan ?? 2,
        label: field.label,
        helperText: field.helperText,
        min: field.min,
        max: field.max,
        size: field.size ?? "md",
        required: field.required ?? false,
        disabled: field.disabled ?? false,
      };

    case "formCalendarField":
      return {
        fieldType: "calendar",
        name: field.name,
        colSpan: field.colSpan ?? 2,
        label: field.label,
        helperText: field.helperText,
        defaultValue: field.defaultValue,
        minDate: field.minDate,
        maxDate: field.maxDate,
        required: field.required ?? false,
        disabled: field.disabled ?? false,
      };

    case "formFileUploadField":
      return {
        fieldType: "fileupload",
        name: field.name,
        colSpan: field.colSpan ?? 2,
        label: field.label,
        helperText: field.helperText,
        accept: field.accept,
        multiple: field.multiple ?? false,
        maxSize:
          field.maxSizeMb !== undefined
            ? field.maxSizeMb * 1024 * 1024
            : undefined,
        required: field.required ?? false,
        disabled: field.disabled ?? false,
      };

    /**
     * Radio Group
     */
    case "formRadioGroupField":
      return {
        fieldType: "radio",

        name: field.name,

        colSpan: field.colSpan ?? 2,

        label: field.label,

        defaultValue: field.defaultValue ?? "",

        options:
          field.options?.map((option) => ({
            value: option.value,

            label: option.label,

            helperText: option.helperText,

            disabled: option.disabled ?? false,

            /**
             * RadioGroup doesn't itself have a
             * required prop. Apply required to
             * its native radio controls instead.
             */
            required: field.required ?? false,
          })) ?? [],
      };

    /**
     * Range
     */
    case "formRangeField":
      return {
        fieldType: "range",

        name: field.name,

        colSpan: field.colSpan ?? 2,

        label: field.label,

        helperText: field.helperText,

        min: field.min ?? 0,

        max: field.max ?? 100,

        step: field.step ?? 1,

        defaultValue: field.defaultValue,

        showValue: field.showValue ?? true,

        required: field.required ?? false,

        disabled: field.disabled ?? false,
      };

    /**
     * Select
     */
    case "formSelectField":
      return {
        fieldType: "select",

        name: field.name,

        colSpan: field.colSpan ?? 2,

        label: field.label,

        placeholder: field.placeholder ?? "Select an option...",

        helperText: field.helperText,

        options:
          field.options?.map((option) => ({
            label: option.label,

            value: option.value,
          })) ?? [],

        multiple: field.multiple ?? false,

        defaultValue: field.multiple
          ? (field.defaultValues ?? [])
          : field.defaultValue,

        size: field.size ?? "md",

        required: field.required ?? false,

        disabled: field.disabled ?? false,
      };

    /**
     * Switch
     */
    case "formSwitchField":
      return {
        fieldType: "switch",

        name: field.name,

        colSpan: field.colSpan ?? 2,

        label: field.label,

        description: field.description,

        value: field.value ?? "on",

        defaultChecked: field.defaultChecked ?? false,

        sizeVariant: field.sizeVariant ?? "md",

        labelPlacement: field.labelPlacement ?? "end",

        required: field.required ?? false,

        disabled: field.disabled ?? false,
      };

    /**
     * Fieldset
     */
    case "formFieldset":
      return {
        fieldType: "fieldset",

        name: field.name,

        colSpan: field.colSpan ?? 2,

        legend: field.legend,

        description: field.description,

        variant: field.variant ?? "standard",

        size: field.size ?? "md",

        disabled: field.disabled ?? false,

        fields: mapFormFields(field.fields),
      };

    /**
     * Hidden Field
     */
    case "formHiddenField":
      return {
        fieldType: "hidden",

        name: field.name,

        value: field.value,
      };

    default:
      console.warn("Unsupported CMS form field:", field);

      return null;
  }
}

function mapFormFields(fields: CmsFormField[] | undefined): FormFieldConfig[] {
  if (!fields?.length) {
    return [];
  }

  return fields
    .map(mapFormField)
    .filter((field): field is FormFieldConfig => field !== null);
}

export function mapFormBlock(block: CmsFormBlock): MappedFormBlockProps {
  const heading = mapSectionHeading(block.heading);
  const imageSrc = resolveSanityImage(block.image, { width: 1200 });
  const imageDimensions = imageSrc
    ? resolveSanityImageDimensions(block.image)
    : undefined;

  const isStepped = block.formMode === "stepped";

  return {
    ...heading,

    formKey: block.formKey?.current ?? block._key,

    blockKey: block._key,

    layout: block.layout ?? "default",

    alignment: block.alignment ?? "left",

    formPosition: block.formPosition ?? "right",

    imageSrc,

    imageSrcSet: resolveSanityImageSrcSet(
      block.image,
      SANITY_RESPONSIVE_WIDTHS.standard,
    ),

    imageSizes: "(max-width: 767px) 100vw, 50vw",

    imageWidth: imageDimensions?.width,

    imageHeight: imageDimensions?.height,

    imageAlt: block.image?.alt ?? "",

    fields: !isStepped ? mapFormFields(block.fields) : undefined,

    steps: isStepped ? mapFormSteps(block.steps) : undefined,

    showProgress: isStepped ? (block.showProgress ?? true) : false,

    nextButtonText: block.nextButtonText ?? "Next",

    previousButtonText: block.previousButtonText ?? "Previous",

    submitButtonText: block.submitButtonText ?? "Submit",

    submitButtonProps: {
      variant: block.submitButtonVariant ?? "primary",

      size: block.submitButtonSize ?? "md",

      iconAlignment: block.submitButtonIconAlignment ?? "right",
    },

    submitButtonIconName: block.submitButtonIcon,

    completionAction: block.completionAction ?? "message",
    successTitle: block.successTitle,
    successMessage: block.successMessage,
    successRedirectPath: block.successRedirectPath,
  };
}
