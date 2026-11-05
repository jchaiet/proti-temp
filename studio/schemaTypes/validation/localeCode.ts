export const LOCALE_CODE_PATTERN = /^[a-z]{2,3}-[a-z]{2}$/

export function validateLocaleCode(value: string | undefined): true | string {
  if (!value) {
    return true
  }

  return LOCALE_CODE_PATTERN.test(value)
    ? true
    : 'Locale Code must use language-region format, for example en-us, es-us, or fil-ph.'
}
