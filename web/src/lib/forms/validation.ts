/** Server-side validation for the public CMS Form Block. No client schema is trusted. */
export interface PublishedFormField {
  _type: string;
  name?: string;
  type?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  minDate?: string;
  maxDate?: string;
  multiple?: boolean;
  options?: { value?: string; disabled?: boolean }[];
  fields?: PublishedFormField[];
}

export interface PublishedFormDefinition {
  _key: string;
  /** Trusted published CMS selection, never taken from the browser. */
  webhookDestination?: string;
  formMode?: string;
  fields?: PublishedFormField[];
  steps?: { fields?: PublishedFormField[] }[];
}

export type SubmittedValue = string | string[];
export type SubmittedValues = Record<string, SubmittedValue>;

export type ValidationResult =
  | { ok: true; values: SubmittedValues }
  | { ok: false; error: string };

const SUBMITTABLE = new Set([
  "formInputField",
  "formTextareaField",
  "formCheckboxField",
  "formDatePickerField",
  "formCalendarField",
  "formFileUploadField",
  "formRadioGroupField",
  "formRangeField",
  "formSelectField",
  "formSwitchField",
  "formHiddenField",
]);
const MAX_FIELDS = 100;
const MAX_STRING_LENGTH = 10_000;

function flattenFields(
  fields: PublishedFormField[] | undefined,
  depth = 0,
): PublishedFormField[] {
  if (!Array.isArray(fields) || depth > 4) return [];
  return fields.flatMap((field) => {
    if (field._type === "formFieldset") {
      return field.disabled ? [] : flattenFields(field.fields, depth + 1);
    }
    return SUBMITTABLE.has(field._type) && !field.disabled ? [field] : [];
  });
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isAllowedValue(value: string, field: PublishedFormField): boolean {
  const type = field._type;
  const options =
    field.options
      ?.filter((option) => !option.disabled)
      .map((option) => option.value) ?? [];

  if (type === "formHiddenField") return value === (field.value ?? "");
  if (type === "formFileUploadField") return false;
  // Native form controls submit an empty string for optional unfilled inputs.
  if (
    value === "" &&
    !field.required &&
    type !== "formCheckboxField" &&
    type !== "formSwitchField"
  )
    return true;
  if (type === "formCheckboxField" || type === "formSwitchField")
    return value === (field.value ?? "on");
  if (type === "formRadioGroupField" || type === "formSelectField")
    return options.includes(value);

  if (type === "formInputField") {
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return false;
    if (field.type === "url") {
      try {
        const url = new URL(value);
        if (url.protocol !== "https:" && url.protocol !== "http:") return false;
      } catch {
        return false;
      }
    }
  }

  if (type === "formDatePickerField" || type === "formCalendarField") {
    if (!isValidDate(value)) return false;
    const minimum = type === "formCalendarField" ? field.minDate : field.min;
    const maximum = type === "formCalendarField" ? field.maxDate : field.max;
    if (typeof minimum === "string" && isValidDate(minimum) && value < minimum)
      return false;
    if (typeof maximum === "string" && isValidDate(maximum) && value > maximum)
      return false;
  }

  if (
    type === "formRangeField" ||
    (type === "formInputField" && field.type === "number")
  ) {
    if (value.trim() === "") return false;
    const number = Number(value);
    if (!Number.isFinite(number)) return false;
    if (typeof field.min === "number" && number < field.min) return false;
    if (typeof field.max === "number" && number > field.max) return false;
  }

  if (typeof field.minLength === "number" && value.length < field.minLength)
    return false;
  if (typeof field.maxLength === "number" && value.length > field.maxLength)
    return false;
  return true;
}

/** Rejects unknown keys, duplicate single-value fields, invalid options and missing required values. */
export function validateFormValues(
  form: PublishedFormDefinition,
  raw: unknown,
): ValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid fields." };
  }

  const fields = flattenFields(
    form.formMode === "stepped"
      ? form.steps?.flatMap((step) => step.fields ?? [])
      : form.fields,
  );
  const byName = new Map<string, PublishedFormField>();
  if (fields.length > MAX_FIELDS)
    return { ok: false, error: "Form configuration is too large." };

  for (const field of fields) {
    if (!field.name || field.name.length > 100 || byName.has(field.name)) {
      return { ok: false, error: "Invalid form configuration." };
    }
    byName.set(field.name, field);
  }
  if (!byName.size) return { ok: false, error: "Form contains no fields." };

  const values = Object.create(null) as SubmittedValues;
  for (const [name, rawValue] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    const field = byName.get(name);
    if (!field || !(typeof rawValue === "string" || Array.isArray(rawValue))) {
      return { ok: false, error: "Invalid field data." };
    }
    const items: unknown[] = Array.isArray(rawValue) ? rawValue : [rawValue];
    if (
      items.length > 30 ||
      items.some(
        (value) =>
          typeof value !== "string" || value.length > MAX_STRING_LENGTH,
      )
    ) {
      return { ok: false, error: "Invalid field data." };
    }
    if (
      items.length !== 1 &&
      !(field._type === "formSelectField" && field.multiple)
    ) {
      return { ok: false, error: "Unexpected multiple values." };
    }
    const strings = items as string[];
    if (strings.some((item) => !isAllowedValue(item, field))) {
      return { ok: false, error: "One or more field values are invalid." };
    }
    values[name] =
      field._type === "formSelectField" && field.multiple
        ? strings
        : strings[0];
  }

  for (const [name, field] of byName) {
    const submitted = values[name];
    if (!field.required) continue;
    if (
      submitted === undefined ||
      submitted === "" ||
      (Array.isArray(submitted) && !submitted.length)
    ) {
      return { ok: false, error: "Please complete all required fields." };
    }
  }
  return { ok: true, values };
}
