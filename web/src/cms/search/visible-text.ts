type UnknownRecord = Record<string, unknown>;

/*
 * Keys whose values should NEVER contribute to search.
 *
 * This is the important guard against terms appearing only
 * inside hrefs, internal references, URLs, embed code,
 * tracking data, file metadata, image alt text, etc.
 */
const BLOCKED_KEYS = new Set([
  "_id",
  "_key",
  "_ref",
  "_type",

  "asset",
  "assets",

  "url",
  "href",
  "src",
  "source",

  "slug",
  "path",

  "link",
  "links",
  "destination",
  "internalPage",
  "externalUrl",
  "externalURL",
  "anchor",

  "email",
  "phone",
  "telephone",

  "script",
  "scripts",
  "html",
  "code",
  "embed",
  "iframe",

  "tracking",
  "analytics",

  /*
   * Alt text is useful for accessibility but is not
   * visible page copy. Keep search aligned with what
   * the visitor can actually read.
   */
  "alt",

  "file",
  "fileType",
  "fileSize",
]);

const SEARCHABLE_STRING_KEYS = new Set([
  "title",
  "eyebrow",
  "description",
  "disclaimer",
  "summary",

  "text",
  "label",
  "name",

  "heading",
  "subheading",

  "body",
  "content",
  "value",

  "question",
  "answer",

  "caption",
  "quote",

  "category",
  "metaLabel",

  "role",
  "jobTitle",
  "company",

  "legend",
  "helpText",
  "placeholder",
  "message",

  "readTime",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collectVisibleStrings(
  value: unknown,
  output: string[],
  key?: string,
): void {
  if (value === null || value === undefined) {
    return;
  }

  if (key && BLOCKED_KEYS.has(key)) {
    return;
  }

  if (typeof value === "string") {
    if (key && SEARCHABLE_STRING_KEYS.has(key)) {
      const cleaned = normalizeWhitespace(value);

      if (cleaned) {
        output.push(cleaned);
      }
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectVisibleStrings(item, output);
    }

    return;
  }

  if (!isRecord(value)) {
    return;
  }

  /*
   * Portable Text stores visible text in:
   *
   * {
   *   _type: "span",
   *   text: "..."
   * }
   *
   * Capture that explicitly. Marks / annotations are ignored.
   */
  if (value._type === "span" && typeof value.text === "string") {
    const text = normalizeWhitespace(value.text);

    if (text) {
      output.push(text);
    }

    return;
  }

  for (const [childKey, childValue] of Object.entries(value)) {
    collectVisibleStrings(childValue, output, childKey);
  }
}

export function extractVisibleText(value: unknown): string {
  const values: string[] = [];

  collectVisibleStrings(value, values);

  return normalizeWhitespace(values.join(" "));
}
