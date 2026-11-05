import {describe, expect, it} from 'vitest'

import {formBlockType} from '../../blocks/formBlockType'
import {formCalendarFieldType} from '../formCalendarFieldType'
import {formFieldsetType} from '../formFieldsetType'
import {formInputFieldType} from '../formInputFieldType'
import {formRadioGroupFieldType} from '../formRadioGroupFieldType'
import {formRangeFieldType} from '../formRangeFieldType'
import {formSelectFieldType} from '../formSelectFieldType'
import {formStepType} from '../formStepType'
import {getFormWebhookDestinationOptions} from '../webhookDestinations'
import {formTextareaFieldType} from '../formTextareaFieldType'

interface SchemaFieldLike {
  name?: string
  validation?: unknown
  of?: Array<{
    type?: string
  }>
}

function getField(schema: {fields?: unknown}, fieldName: string): SchemaFieldLike | undefined {
  const fields = (schema.fields ?? []) as SchemaFieldLike[]

  return fields.find((candidate) => candidate.name === fieldName)
}

function getArrayMemberTypes(schema: {fields?: unknown}, fieldName: string): string[] {
  return (
    getField(schema, fieldName)
      ?.of?.map((member) => member.type)
      .filter((type): type is string => Boolean(type)) ?? []
  )
}

describe('typed Form schema contract', () => {
  it('allows Divider and Spacer in single-page forms', () => {
    const types = getArrayMemberTypes(formBlockType, 'fields')

    expect(types).toContain('formDividerField')
    expect(types).toContain('formSpacerField')
    expect(types).not.toContain('formField')
  })

  it('allows Divider and Spacer inside stepped-form steps', () => {
    const types = getArrayMemberTypes(formStepType, 'fields')

    expect(types).toContain('formDividerField')
    expect(types).toContain('formSpacerField')
    expect(types).not.toContain('formField')
  })

  it('allows Divider and Spacer inside fieldsets', () => {
    const types = getArrayMemberTypes(formFieldsetType, 'fields')

    expect(types).toContain('formDividerField')
    expect(types).toContain('formSpacerField')
    expect(types).not.toContain('formField')
  })

  it('wires whole-form integrity validation into single and stepped forms', () => {
    expect(getField(formBlockType, 'fields')?.validation).toBeTypeOf('function')
    expect(getField(formBlockType, 'steps')?.validation).toBeTypeOf('function')
    expect(getField(formStepType, 'fields')?.validation).toBeTypeOf('function')
    expect(getField(formFieldsetType, 'fields')?.validation).toBeTypeOf('function')
  })

  it('wires option/default integrity validation into Radio and Select fields', () => {
    expect(getField(formRadioGroupFieldType, 'options')?.validation).toBeTypeOf('function')
    expect(getField(formRadioGroupFieldType, 'defaultValue')?.validation).toBeTypeOf('function')
    expect(getField(formSelectFieldType, 'options')?.validation).toBeTypeOf('function')
    expect(getField(formSelectFieldType, 'defaultValue')?.validation).toBeTypeOf('function')
    expect(getField(formSelectFieldType, 'defaultValues')?.validation).toBeTypeOf('function')
  })

  it('wires min/max integrity validation into authored bounded fields', () => {
    expect(getField(formInputFieldType, 'defaultValue')?.validation).toBeTypeOf('function')
    expect(getField(formInputFieldType, 'minLength')?.validation).toBeTypeOf('function')
    expect(getField(formInputFieldType, 'maxLength')?.validation).toBeTypeOf('function')
    expect(getField(formInputFieldType, 'min')?.validation).toBeTypeOf('function')
    expect(getField(formInputFieldType, 'max')?.validation).toBeTypeOf('function')
    expect(getField(formTextareaFieldType, 'minLength')?.validation).toBeTypeOf('function')
    expect(getField(formTextareaFieldType, 'maxLength')?.validation).toBeTypeOf('function')
    expect(getField(formCalendarFieldType, 'minDate')?.validation).toBeTypeOf('function')
    expect(getField(formCalendarFieldType, 'maxDate')?.validation).toBeTypeOf('function')
    expect(getField(formRangeFieldType, 'min')?.validation).toBeTypeOf('function')
    expect(getField(formRangeFieldType, 'max')?.validation).toBeTypeOf('function')
    expect(getField(formRangeFieldType, 'defaultValue')?.validation).toBeTypeOf('function')
  })
})

describe('Form submission completion schema', () => {
  it('exposes the confirmation and redirect behavior fields', () => {
    for (const field of [
      'completionAction',
      'successTitle',
      'successMessage',
      'successRedirectPath',
    ]) {
      expect(getField(formBlockType, field)).toBeDefined()
    }
    expect(getField(formBlockType, 'successRedirectPath')?.validation).toBeTypeOf('function')
  })
})

describe('Form webhook destination schema', () => {
  it('exposes an editor-visible destination selector with the default', () => {
    const field = getField(formBlockType, 'webhookDestination') as
      (SchemaFieldLike & {options?: {list?: Array<{value: string}>}}) | undefined
    expect(field).toBeDefined()
    expect(field?.options?.list?.[0]?.value).toBe('default')
  })

  it('parses and deduplicates approved public Studio destination keys', () => {
    expect(
      getFormWebhookDestinationOptions(
        'contact:Contact,newsletter:Newsletter,contact:Duplicate,malformed,evil.key:Evil',
      ),
    ).toEqual([
      {title: 'Default Webhook', value: 'default'},
      {title: 'Contact', value: 'contact'},
      {title: 'Newsletter', value: 'newsletter'},
    ])
  })
})
