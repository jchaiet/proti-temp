import {describe, expect, it} from 'vitest'

import {
  validateContainsSubmittableField,
  validateDateDefaultWithinBounds,
  validateDateMinMax,
  validateDefaultOptionValue,
  validateDefaultOptionValues,
  validateNonBlankText,
  validateNumericDefaultWithinBounds,
  validateNumericInputDefaultWithinBounds,
  validateNumericMinMax,
  validateSingleFormFields,
  validateSteppedFormSteps,
  validateSubmittedFieldName,
  validateUniqueFieldsetKeys,
  validateUniqueOptionValues,
  validateUniqueSubmittedFieldNames,
} from '../validation'

describe('Form data integrity validation', () => {
  it('rejects submitted field names that contain only whitespace', () => {
    expect(validateSubmittedFieldName('   ')).toBe(
      'Field Name cannot be empty or contain only whitespace.',
    )
    expect(validateSubmittedFieldName('email')).toBe(true)
  })

  it('supports reusable non-blank validation for authored labels and keys', () => {
    expect(validateNonBlankText('   ', 'Legend')).toBe(
      'Legend cannot be empty or contain only whitespace.',
    )
    expect(validateNonBlankText('Contact details', 'Legend')).toBe(true)
  })

  it('rejects duplicate submitted field names case-insensitively', () => {
    expect(
      validateUniqueSubmittedFieldNames([
        {_type: 'formInputField', name: 'Email'},
        {_type: 'formHiddenField', name: 'email'},
      ]),
    ).toContain('“Email”')
  })

  it('finds duplicate submitted names inside fieldsets', () => {
    expect(
      validateUniqueSubmittedFieldNames([
        {_type: 'formInputField', name: 'firstName'},
        {
          _type: 'formFieldset',
          name: 'contact',
          fields: [{_type: 'formTextareaField', name: 'firstName'}],
        },
      ]),
    ).not.toBe(true)
  })

  it('ignores Divider, Spacer, and Fieldset keys when checking submitted names', () => {
    expect(
      validateUniqueSubmittedFieldNames([
        {_type: 'formDividerField'},
        {_type: 'formSpacerField'},
        {
          _type: 'formFieldset',
          name: 'email',
          fields: [{_type: 'formInputField', name: 'email'}],
        },
      ]),
    ).toBe(true)
  })

  it('requires a single-page form to contain a submittable field', () => {
    expect(
      validateContainsSubmittableField([{_type: 'formDividerField'}, {_type: 'formSpacerField'}]),
    ).toBe(
      'Form must contain at least one submittable field. Divider and Spacer do not submit values.',
    )
  })

  it('treats controls nested inside a Fieldset as submittable fields', () => {
    expect(
      validateContainsSubmittableField([
        {
          _type: 'formFieldset',
          name: 'contact',
          fields: [{_type: 'formInputField', name: 'email'}],
        },
      ]),
    ).toBe(true)
  })

  it('validates duplicate Fieldset Keys independently of submitted field names', () => {
    expect(
      validateUniqueFieldsetKeys([
        {
          _type: 'formFieldset',
          name: 'Contact',
          fields: [{_type: 'formInputField', name: 'email'}],
        },
        {
          _type: 'formFieldset',
          name: 'contact',
          fields: [{_type: 'formInputField', name: 'phone'}],
        },
      ]),
    ).toContain('Duplicate key')
  })

  it('validates the complete single-page form field collection', () => {
    expect(
      validateSingleFormFields([
        {_type: 'formInputField', name: 'email'},
        {_type: 'formTextareaField', name: 'message'},
      ]),
    ).toBe(true)

    expect(
      validateSingleFormFields([
        {_type: 'formInputField', name: 'email'},
        {_type: 'formTextareaField', name: 'email'},
      ]),
    ).not.toBe(true)
  })

  it('requires every stepped-form step to contain a submittable field', () => {
    expect(
      validateSteppedFormSteps([
        {
          title: 'Contact',
          fields: [{_type: 'formInputField', name: 'email'}],
        },
        {
          title: 'Review',
          fields: [{_type: 'formDividerField'}],
        },
      ]),
    ).toContain('Step 2 (“Review”) must contain at least one submittable field')
  })

  it('catches duplicate submitted names across different steps and nested Fieldsets', () => {
    expect(
      validateSteppedFormSteps([
        {
          title: 'Contact',
          fields: [{_type: 'formInputField', name: 'email'}],
        },
        {
          title: 'Details',
          fields: [
            {
              _type: 'formFieldset',
              name: 'details',
              fields: [{_type: 'formTextareaField', name: 'email'}],
            },
          ],
        },
      ]),
    ).toContain('Duplicate name')
  })

  it('catches duplicate Fieldset Keys across different steps', () => {
    expect(
      validateSteppedFormSteps([
        {
          title: 'One',
          fields: [
            {
              _type: 'formFieldset',
              name: 'contact',
              fields: [{_type: 'formInputField', name: 'email'}],
            },
          ],
        },
        {
          title: 'Two',
          fields: [
            {
              _type: 'formFieldset',
              name: 'Contact',
              fields: [{_type: 'formInputField', name: 'phone'}],
            },
          ],
        },
      ]),
    ).toContain('Duplicate key')
  })

  it('rejects duplicate Radio/Select option values after trimming whitespace', () => {
    expect(validateUniqueOptionValues([{value: 'yes'}, {value: ' yes '}, {value: 'no'}])).toContain(
      'Duplicate value',
    )

    expect(validateUniqueOptionValues([{value: 'yes'}, {value: 'no'}])).toBe(true)
  })

  it('requires a single default option to reference a configured value', () => {
    const options = [{value: 'red'}, {value: 'blue'}]

    expect(validateDefaultOptionValue('blue', options)).toBe(true)
    expect(validateDefaultOptionValue('green', options)).toContain('was not found')
  })

  it('validates multiple Select defaults against configured option values', () => {
    const options = [{value: 'red'}, {value: 'blue'}, {value: 'green'}]

    expect(validateDefaultOptionValues(['red', 'green'], options)).toBe(true)
    expect(validateDefaultOptionValues(['red', 'missing'], options)).toContain('Not found')
    expect(validateDefaultOptionValues(['red', 'red'], options)).toContain(
      'must not contain duplicates',
    )
    expect(validateDefaultOptionValues(['red', '   '], options)).toContain(
      'cannot contain empty values',
    )
  })

  it('rejects numeric ranges whose minimum is greater than the maximum', () => {
    expect(validateNumericMinMax(10, 5)).toBe('Minimum cannot be greater than Maximum.')
    expect(validateNumericMinMax(5, 10)).toBe(true)
  })

  it('rejects date ranges whose minimum is later than the maximum', () => {
    expect(validateDateMinMax('2026-09-20', '2026-09-10')).toBe(
      'Minimum Date cannot be later than Maximum Date.',
    )
    expect(validateDateMinMax('2026-09-10', '2026-09-20')).toBe(true)
  })

  it('validates number-input defaults before applying configured bounds', () => {
    expect(validateNumericInputDefaultWithinBounds('7', 5, 10)).toBe(true)
    expect(validateNumericInputDefaultWithinBounds('nope', 5, 10)).toBe(
      'Default Value must be a valid number.',
    )
    expect(validateNumericInputDefaultWithinBounds('11', 5, 10)).toBe(
      'Default Value cannot be greater than Maximum.',
    )
  })

  it('keeps numeric defaults inside configured bounds', () => {
    expect(validateNumericDefaultWithinBounds(4, 5, 10)).toBe(
      'Default Value cannot be less than Minimum.',
    )
    expect(validateNumericDefaultWithinBounds(11, 5, 10)).toBe(
      'Default Value cannot be greater than Maximum.',
    )
    expect(validateNumericDefaultWithinBounds(7, 5, 10)).toBe(true)
  })

  it('keeps Calendar defaults inside configured date bounds', () => {
    expect(validateDateDefaultWithinBounds('2026-09-01', '2026-09-10', '2026-09-20')).toBe(
      'Default Date cannot be earlier than Minimum Date.',
    )
    expect(validateDateDefaultWithinBounds('2026-09-25', '2026-09-10', '2026-09-20')).toBe(
      'Default Date cannot be later than Maximum Date.',
    )
    expect(validateDateDefaultWithinBounds('2026-09-15', '2026-09-10', '2026-09-20')).toBe(true)
  })
})
