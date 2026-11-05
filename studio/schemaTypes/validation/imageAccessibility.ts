import type {ValidationContext} from 'sanity'

export type ImageValue = {
  asset?: {
    _ref?: string
  }
}

function hasImageAsset(image?: ImageValue): boolean {
  return Boolean(image?.asset?._ref)
}

export function validateImageAlt(
  value: string | undefined,
  context: ValidationContext,
  label = 'Image',
): true | string {
  const image = context.parent as ImageValue | undefined

  if (!hasImageAsset(image)) {
    return true
  }

  if (!value?.trim()) {
    return `${label} Alternative Text is required when an image is selected.`
  }

  return true
}

export function validateImageAltForImage(
  value: string | undefined,
  image: ImageValue | undefined,
  label = 'Image',
): true | string {
  if (!hasImageAsset(image)) {
    return true
  }

  if (!value?.trim()) {
    return `${label} Alternative Text is required when an image is selected.`
  }

  return true
}
