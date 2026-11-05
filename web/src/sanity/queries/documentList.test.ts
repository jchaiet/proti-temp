import { describe, expect, it } from "vitest";

import { getDynamicDocumentListQuery } from "./documentList";

describe("getDynamicDocumentListQuery", () => {
  it("scopes dynamic documents to Site and locale", () => {
    const query = getDynamicDocumentListQuery("newest");

    expect(query).toContain("site._ref == $siteId");
    expect(query).toContain("locale == $locale");
    expect(query).toContain("_type in $types");
  });

  it("does not restrict taxonomy when no taxonomy IDs are selected", () => {
    const query = getDynamicDocumentListQuery("newest");

    expect(query).toContain("count($taxonomyIds) == 0");
  });

  it("supports taxonomy ALL matching", () => {
    const query = getDynamicDocumentListQuery("newest");

    expect(query).toContain('$taxonomyMatchLogic == "all"');
    expect(query).toContain(
      "count(\n            taxonomy[\n              _ref in $taxonomyIds",
    );
    expect(query).toContain("== count($taxonomyIds)");
  });

  it("supports taxonomy ANY matching", () => {
    const query = getDynamicDocumentListQuery("newest");

    expect(query).toContain('$taxonomyMatchLogic != "all"');
    expect(query).toContain("> 0");
  });

  it.each([
    ["newest", "coalesce(publishedAt, publishDate, date, _createdAt) desc"],
    ["oldest", "coalesce(publishedAt, publishDate, date, _createdAt) asc"],
    ["title-asc", "title asc"],
    ["title-desc", "title desc"],
  ] as const)("uses the correct %s sort expression", (sort, expected) => {
    expect(getDynamicDocumentListQuery(sort)).toContain(`| order(${expected})`);
  });

  it("projects full crop/hotspot image data and localized taxonomy titles", () => {
    const query = getDynamicDocumentListQuery("newest");

    expect(query).toContain('"crop": mainImage.crop');
    expect(query).toContain('"hotspot": mainImage.hotspot');
    expect(query).toContain('"crop": image.crop');
    expect(query).toContain('"hotspot": image.hotspot');
    expect(query).toContain('"crop": thumbnail.crop');
    expect(query).toContain('"hotspot": thumbnail.hotspot');

    expect(query).toContain(
      "translations[\n            locale == $locale\n          ][0].title",
    );

    expect(query).not.toContain("asset->url");
  });
});

describe("Dynamic Document List Page routing", () => {
  it("projects the string-valued Page slug, homepage flag, and parent reference", () => {
    const query = getDynamicDocumentListQuery("newest");

    expect(query).toContain('_type == "page" => slug');
    expect(query).toContain("slug.current");
    expect(query).toContain("isHomepage");
    expect(query).toContain('"parentId": parent._ref');
  });

  it("keeps sorting and limit at query time, before resolving Page parents", () => {
    const query = getDynamicDocumentListQuery("title-desc");

    expect(query).toContain("| order(title desc)");
    expect(query).toContain("[0...$limit]");
    expect(query).toContain("count($taxonomyIds) == 0");
  });
});
