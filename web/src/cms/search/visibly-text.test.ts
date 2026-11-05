import { describe, expect, it } from "vitest";

import { extractVisibleText } from "./visible-text";

describe("extractVisibleText", () => {
  it("extracts visible strings and Portable Text span content", () => {
    const result = extractVisibleText([
      {
        _type: "contentBlock",
        title: "Nutrition Guide",
        description: "A practical introduction.",
        body: [
          {
            _type: "block",
            children: [
              {
                _type: "span",
                text: "Eat more whole foods.",
              },
            ],
          },
        ],
      },
    ]);

    expect(result).toContain("Nutrition Guide");
    expect(result).toContain("A practical introduction.");
    expect(result).toContain("Eat more whole foods.");
  });

  it("excludes hrefs, URLs, scripts, code, HTML, and internal references", () => {
    const result = extractVisibleText({
      title: "Unrelated visible title",
      href: "https://nutrition.example.com",
      url: "https://nutrition.example.com",
      script: "nutrition",
      scripts: ["nutrition"],
      code: "const nutrition = true",
      html: "<span>nutrition</span>",
      destination: "/nutrition",
      internalPage: {
        _ref: "nutrition-page",
      },
    });

    expect(result).toBe("Unrelated visible title");
    expect(result.toLowerCase()).not.toContain("nutrition");
  });

  it("excludes image alt text from searchable visible copy", () => {
    const result = extractVisibleText({
      title: "Healthy eating",
      image: {
        alt: "nutrition chart",
      },
    });

    expect(result).toBe("Healthy eating");
    expect(result.toLowerCase()).not.toContain("nutrition");
  });

  it("normalizes whitespace", () => {
    expect(
      extractVisibleText({
        description: "  Healthy   food\nfor\teveryone  ",
      }),
    ).toBe("Healthy food for everyone");
  });
});
