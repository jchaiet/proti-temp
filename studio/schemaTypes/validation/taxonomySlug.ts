type SlugValue = {
  current?: string
}

const TAXONOMY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validateTaxonomySlug(slug: SlugValue | undefined): true | string {
  const value = slug?.current

  if (!value) {
    return true
  }

  return TAXONOMY_SLUG_PATTERN.test(value)
    ? true
    : 'URL Segment may only contain lowercase letters, numbers, and hyphens.'
}
