/**
 * Runtime guards for URLs supplied by CMS content. Studio validation can be
 * bypassed by imports, API writes, older documents, or schema migrations.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function isSafeWebUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    return false;
  }
  if (CONTROL_CHARACTERS.test(value) || value.includes("\\")) return false;
  if (!/^https?:\/\//i.test(value)) return false;

  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/** Rich text supports web URLs, mail/phone schemes, and site-local anchors. */
export function isSafeContentHref(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    return false;
  }
  if (CONTROL_CHARACTERS.test(value) || value.includes("\\")) return false;

  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.startsWith("#") && value.length > 1) return true;
  if (/^mailto:[^\s?@]+@[^\s?@]+(?:\?[^\s]*)?$/i.test(value)) return true;
  if (/^tel:[+0-9()\s.-]+$/i.test(value)) return true;

  // Check this last: isSafeWebUrl is a string type predicate, so when
  // called with an already-narrowed string, its false branch narrows to never.
  return isSafeWebUrl(value);
}

/** Redirect paths must remain relative to the current host and Site. */
export function isSafeRedirectPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[?#]/.test(value) &&
    !CONTROL_CHARACTERS.test(value)
  );
}
