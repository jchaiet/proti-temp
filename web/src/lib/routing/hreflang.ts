/**
 * Convert a Proti language-region locale into a Google-compatible hreflang.
 *
 * Proti supports 2- or 3-letter application language codes, for example:
 *
 *   en-us  -> en-US
 *   es-us  -> es-US
 *   fil-ph -> fil-PH
 *
 * Google hreflang requires the language portion to use an ISO 639-1
 * two-letter language code, so 3-letter application language codes are
 * intentionally omitted from hreflang output.
 */
export function siteLocaleToHreflang(locale: string): string | null {
  const match = /^([a-z]{2})-([a-z]{2})$/i.exec(locale.trim());

  if (!match) {
    return null;
  }

  const [, language, region] = match;

  return `${language.toLowerCase()}-${region.toUpperCase()}`;
}
