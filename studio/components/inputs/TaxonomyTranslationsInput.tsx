import type {ArrayOfObjectsInputProps} from 'sanity'

import {
  hasMeaningfulValue,
  LocalizedFieldsInput,
  type LocalizedTranslationValue,
} from './LocalizedFieldsInput'

function isTaxonomyTranslationComplete(
  translation: LocalizedTranslationValue,
  document: Record<string, unknown>,
): boolean {
  const checks: Array<{
    base: unknown
    translated: unknown
  }> = [
    {
      base: document.title,
      translated: translation.title,
    },

    {
      base: document.description,
      translated: translation.description,
    },
  ]

  return checks.every(
    ({base, translated}) => !hasMeaningfulValue(base) || hasMeaningfulValue(translated),
  )
}

export function TaxonomyTranslationsInput(props: ArrayOfObjectsInputProps) {
  return (
    <LocalizedFieldsInput
      inputProps={props}
      config={{
        translationType: 'taxonomyTranslation',
        focusField: 'title',

        isComplete: isTaxonomyTranslationComplete,
      }}
    />
  )
}
