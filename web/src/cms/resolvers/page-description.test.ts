import { describe, expect, it } from "vitest";

import type { CmsBlock } from "@/cms/types";

import { getPageContentDescription } from "./page-description";

const paragraph = (text: string) => ({
  _key: "paragraph",
  _type: "block" as const,
  style: "normal" as const,
  markDefs: [],
  children: [
    {
      _key: "span",
      _type: "span" as const,
      marks: [],
      text,
    },
  ],
});

describe("Page metadata fallback from localized content", () => {
  it("prefers the Hero description even if lower blocks have copy", () => {
    const sections: CmsBlock[] = [
      {
        _key: "content",
        _type: "contentBlock",
        heading: { description: [paragraph("Lower-page description.")] },
      },
      {
        _key: "hero",
        _type: "heroBlock",
        heading: {
          title: [paragraph("Widget title")],
          description: [paragraph("Helpful widget overview for visitors.")],
        },
      },
    ];

    expect(getPageContentDescription(sections)).toBe(
      "Helpful widget overview for visitors.",
    );
  });

  it("uses a rich text paragraph when sections have no descriptions", () => {
    const sections: CmsBlock[] = [
      {
        _key: "hero",
        _type: "heroBlock",
        heading: { title: [paragraph("Widget heading only")] },
      },
      {
        _key: "body",
        _type: "richTextBlock",
        content: [paragraph("  Explore   features and learn more.  ")],
      },
    ];

    expect(getPageContentDescription(sections)).toBe(
      "Explore features and learn more.",
    );
  });

  it("avoids inventing a description when no content copy exists", () => {
    expect(getPageContentDescription([])).toBeUndefined();
    expect(
      getPageContentDescription([
        {
          _key: "hero",
          _type: "heroBlock",
          heading: { title: [paragraph("Just a title")] },
        },
        { _key: "singleton", _type: "singletonReferenceBlock" },
      ]),
    ).toBeUndefined();
  });

  it("clips long descriptions without cutting most words in half", () => {
    const value =
      "This is a descriptive introduction to a widget with helpful details. ".repeat(
        5,
      );
    const description = getPageContentDescription([
      {
        _key: "hero",
        _type: "heroBlock",
        heading: { description: [paragraph(value)] },
      },
    ]);

    expect(description?.endsWith("…")).toBe(true);
    expect(description?.length ?? 0).toBeLessThanOrEqual(161);
  });
});
