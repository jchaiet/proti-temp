export interface FormOptionLike {
  value?: unknown
}

export interface FormFieldLike {
  _type?: string
  name?: unknown
  fields?: unknown
}

export interface FormStepLike {
  title?: unknown
  fields?: unknown
}

const SUBMITTABLE_FIELD_TYPES = new Set([
  'formInputField',
  'formTextareaField',
  'formCheckboxField',
  'formDatePickerField',
  'formCalendarField',
  'formFileUploadField',
  'formRadioGroupField',
  'formRangeField',
  'formSelectField',
  'formSwitchField',
  'formHiddenField',
])

function asFields(value: unknown): FormFieldLike[] {
  return Array.isArray(value) ? (value as FormFieldLike[]) : []
}

function normalizedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()

  return normalized || undefined
}

function collectSubmittableFields(value: unknown): FormFieldLike[] {
  const result: FormFieldLike[] = []

  for (const field of asFields(value)) {
    if (field?._type === 'formFieldset') {
      result.push(...collectSubmittableFields(field.fields))
      continue
    }

    if (field?._type && SUBMITTABLE_FIELD_TYPES.has(field._type)) {
      result.push(field)
    }
  }

  return result
}

function collectFieldsets(value: unknown): FormFieldLike[] {
  const result: FormFieldLike[] = []

  for (const field of asFields(value)) {
    if (field?._type !== 'formFieldset') {
      continue
    }

    result.push(field)
    result.push(...collectFieldsets(field.fields))
  }

  return result
}

function duplicateValues(values: Array<string | undefined>, caseInsensitive = false): string[] {
  const counts = new Map<string, {display: string; count: number}>()

  for (const value of values) {
    if (!value) {
      continue
    }

    const key = caseInsensitive ? value.toLowerCase() : value
    const current = counts.get(key)

    if (current) {
      current.count += 1
    } else {
      counts.set(key, {
        display: value,
        count: 1,
      })
    }
  }

  return Array.from(counts.values())
    .filter(({count}) => count > 1)
    .map(({display}) => display)
    .sort((a, b) => a.localeCompare(b))
}

function quotedList(values: string[]): string {
  return values.map((value) => `“${value}”`).join(', ')
}

function optionValues(options: unknown): string[] {
  if (!Array.isArray(options)) {
    return []
  }

  return options
    .map((option) => normalizedString((option as FormOptionLike | undefined)?.value))
    .filter((value): value is string => Boolean(value))
}

function parseDate(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value) {
    return undefined
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : undefined
}

function formatStepLabel(step: FormStepLike, index: number): string {
  const title = normalizedString(step.title)

  return title ? `Step ${index + 1} (“${title}”)` : `Step ${index + 1}`
}

export function validateNonBlankText(value: unknown, label: string): true | string {
  if (value === undefined || value === null) {
    return true
  }

  if (normalizedString(value)) {
    return true
  }

  return `${label} cannot be empty or contain only whitespace.`
}

export function validateSubmittedFieldName(value: unknown): true | string {
  return validateNonBlankText(value, 'Field Name')
}

export function validateUniqueSubmittedFieldNames(value: unknown): true | string {
  const duplicates = duplicateValues(
    collectSubmittableFields(value).map((field) => normalizedString(field.name)),
    true,
  )

  if (duplicates.length === 0) {
    return true
  }

  return `Submitted field names must be unique across the entire form. Duplicate name${
    duplicates.length === 1 ? '' : 's'
  }: ${quotedList(duplicates)}.`
}

export function validateUniqueFieldsetKeys(value: unknown): true | string {
  const duplicates = duplicateValues(
    collectFieldsets(value).map((field) => normalizedString(field.name)),
    true,
  )

  if (duplicates.length === 0) {
    return true
  }

  return `Fieldset Keys must be unique across the entire form. Duplicate key${
    duplicates.length === 1 ? '' : 's'
  }: ${quotedList(duplicates)}.`
}

export function validateContainsSubmittableField(value: unknown, label = 'Form'): true | string {
  if (collectSubmittableFields(value).length > 0) {
    return true
  }

  return `${label} must contain at least one submittable field. Divider and Spacer do not submit values.`
}

export function validateSingleFormFields(value: unknown): true | string {
  const containsField = validateContainsSubmittableField(value)

  if (containsField !== true) {
    return containsField
  }

  const uniqueNames = validateUniqueSubmittedFieldNames(value)

  if (uniqueNames !== true) {
    return uniqueNames
  }

  return validateUniqueFieldsetKeys(value)
}

export function validateSteppedFormSteps(value: unknown): true | string {
  if (!Array.isArray(value)) {
    return true
  }

  const steps = value as FormStepLike[]

  for (let index = 0; index < steps.length; index += 1) {
    const result = validateContainsSubmittableField(
      steps[index]?.fields,
      formatStepLabel(steps[index] ?? {}, index),
    )

    if (result !== true) {
      return result
    }
  }

  const allFields = steps.flatMap((step) => asFields(step?.fields))

  const uniqueNames = validateUniqueSubmittedFieldNames(allFields)

  if (uniqueNames !== true) {
    return uniqueNames
  }

  return validateUniqueFieldsetKeys(allFields)
}

export function validateUniqueOptionValues(options: unknown): true | string {
  const duplicates = duplicateValues(optionValues(options))

  if (duplicates.length === 0) {
    return true
  }

  return `Option values must be unique. Duplicate value${
    duplicates.length === 1 ? '' : 's'
  }: ${quotedList(duplicates)}.`
}

export function validateDefaultOptionValue(value: unknown, options: unknown): true | string {
  const defaultValue = normalizedString(value)

  if (!defaultValue) {
    return true
  }

  if (optionValues(options).includes(defaultValue)) {
    return true
  }

  return `Default Value must match one of the configured option values. “${defaultValue}” was not found.`
}

export function validateDefaultOptionValues(value: unknown, options: unknown): true | string {
  if (!Array.isArray(value) || value.length === 0) {
    return true
  }

  const defaults = value.map(normalizedString)

  if (defaults.some((item) => !item)) {
    return 'Default Values cannot contain empty values.'
  }

  const normalizedDefaults = defaults as string[]
  const duplicateDefaults = duplicateValues(normalizedDefaults)

  if (duplicateDefaults.length > 0) {
    return `Default Values must not contain duplicates. Duplicate value${
      duplicateDefaults.length === 1 ? '' : 's'
    }: ${quotedList(duplicateDefaults)}.`
  }

  const configuredValues = new Set(optionValues(options))
  const missing = normalizedDefaults.filter((item) => !configuredValues.has(item))

  if (missing.length === 0) {
    return true
  }

  return `Every Default Value must match a configured option value. Not found: ${quotedList(
    missing,
  )}.`
}

export function validateNumericMinMax(
  min: unknown,
  max: unknown,
  minLabel = 'Minimum',
  maxLabel = 'Maximum',
): true | string {
  if (typeof min !== 'number' || typeof max !== 'number') {
    return true
  }

  if (min <= max) {
    return true
  }

  return `${minLabel} cannot be greater than ${maxLabel}.`
}

export function validateDateMinMax(
  min: unknown,
  max: unknown,
  minLabel = 'Minimum Date',
  maxLabel = 'Maximum Date',
): true | string {
  const minDate = parseDate(min)
  const maxDate = parseDate(max)

  if (minDate === undefined || maxDate === undefined || minDate <= maxDate) {
    return true
  }

  return `${minLabel} cannot be later than ${maxLabel}.`
}

export function validateNumericDefaultWithinBounds(
  value: unknown,
  min: unknown,
  max: unknown,
): true | string {
  if (typeof value !== 'number') {
    return true
  }

  if (typeof min === 'number' && value < min) {
    return 'Default Value cannot be less than Minimum.'
  }

  if (typeof max === 'number' && value > max) {
    return 'Default Value cannot be greater than Maximum.'
  }

  return true
}

export function validateNumericInputDefaultWithinBounds(
  value: unknown,
  min: unknown,
  max: unknown,
): true | string {
  if (value === undefined || value === null || value === '') {
    return true
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return 'Default Value must be a valid number.'
  }

  const numericValue = typeof value === 'number' ? value : Number(value.trim())

  if (!Number.isFinite(numericValue)) {
    return 'Default Value must be a valid number.'
  }

  return validateNumericDefaultWithinBounds(numericValue, min, max)
}

export function validateDateDefaultWithinBounds(
  value: unknown,
  min: unknown,
  max: unknown,
): true | string {
  const defaultDate = parseDate(value)

  if (defaultDate === undefined) {
    return true
  }

  const minDate = parseDate(min)
  const maxDate = parseDate(max)

  if (minDate !== undefined && defaultDate < minDate) {
    return 'Default Date cannot be earlier than Minimum Date.'
  }

  if (maxDate !== undefined && defaultDate > maxDate) {
    return 'Default Date cannot be later than Maximum Date.'
  }

  return true
}
