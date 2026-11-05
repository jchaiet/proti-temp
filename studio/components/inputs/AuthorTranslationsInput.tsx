import type {ArrayOfObjectsInputProps} from 'sanity'

import {
  hasMeaningfulValue,
  LocalizedFieldsInput,
  type LocalizedTranslationValue,
} from './LocalizedFieldsInput'

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function isAuthorTranslationComplete(
  translation: LocalizedTranslationValue,
  document: Record<string, unknown>,
): boolean {
  const image = getObject(document.image)

  const baseBio = document.bioRichText ?? document.bio

  const translatedBio = translation.bioRichText ?? translation.bio

  const checks: Array<{
    base: unknown
    translated: unknown
  }> = [
    {
      base: document.name,
      translated: translation.name,
    },

    {
      base: document.jobTitle,
      translated: translation.jobTitle,
    },

    {
      base: baseBio,
      translated: translatedBio,
    },

    {
      base: image.alt,
      translated: translation.imageAlt,
    },
  ]

  return checks.every(
    ({base, translated}) => !hasMeaningfulValue(base) || hasMeaningfulValue(translated),
  )
}

export function AuthorTranslationsInput(props: ArrayOfObjectsInputProps) {
  return (
    <LocalizedFieldsInput
      inputProps={props}
      config={{
        translationType: 'authorTranslation',
        focusField: 'name',

        isComplete: isAuthorTranslationComplete,
      }}
    />
  )
}
