import type { PortableTextBlock } from "@portabletext/types";

import type { CmsBlock } from "@/cms/types";

const MAX_DESCRIPTION_LENGTH = 160;

function textFromPortableText(
  blocks?: PortableTextBlock[],
): string | undefined {
  if (!Array.isArray(blocks)) {
    return undefined;
  }

  const text = blocks
    .filter((block) => block._type === "block")
    .map((block) =>
      (block.children ?? [])
        .map((child) => ("text" in child ? child.text : ""))
        .join(""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text || undefined;
}

function shortenDescription(value: string): string {
  if (value.length <= MAX_DESCRIPTION_LENGTH) {
    return value;
  }

  const firstPart = value.slice(0, MAX_DESCRIPTION_LENGTH + 1);
  const lastSpace = firstPart.lastIndexOf(" ");
  const end = lastSpace >= 90 ? lastSpace : MAX_DESCRIPTION_LENGTH;

  return `${value
    .slice(0, end)
    .trimEnd()
    .replace(/[.,;:!?-]+$/, "")}…`;
}

/**
 * A last-resort, localized description for CMS Pages without an explicit
 * SEO description or a localized Site SEO default. Only published Page copy
 * is considered; headings and titles alone are not useful descriptions.
 */
export function getPageContentDescription(
  sections?: CmsBlock[],
): string | undefined {
  if (!sections?.length) {
    return undefined;
  }

  // Prefer the opening Hero's explanatory copy over unrelated lower sections.
  const candidates = [
    ...sections.filter((block) => block._type === "heroBlock"),
    ...sections.filter((block) => block._type !== "heroBlock"),
  ];

  for (const block of candidates) {
    if ("heading" in block) {
      const description = textFromPortableText(block.heading?.description);

      if (description) {
        return shortenDescription(description);
      }
    }

    if (block._type === "richTextBlock") {
      const description = textFromPortableText(block.content);

      if (description) {
        return shortenDescription(description);
      }
    }
  }

  return undefined;
}
