import { describe, expect, it, vi } from "vitest";

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: vi.fn(),
  },
}));

import { PAGE_BY_ID_QUERY } from "./page";
import { BLOG_BY_SLUG_QUERY } from "./blog";
import { SEARCH_CONTENT_QUERY } from "./search";
import { SINGLETON_REFERENCE_BLOCK_FRAGMENT } from "@/sanity/fragments";

describe("Singleton query contract", () => {
  it("dereferences Singleton components from Pages", () => {
    expect(PAGE_BY_ID_QUERY).toContain('_type == "singletonReferenceBlock"');
    expect(PAGE_BY_ID_QUERY).toContain("singleton->site._ref == $siteId");
    expect(PAGE_BY_ID_QUERY).toContain("singleton->locale == $locale");
    expect(PAGE_BY_ID_QUERY).toContain('"component": component[0]');
  });

  it("dereferences Singleton components from Blogs", () => {
    expect(BLOG_BY_SLUG_QUERY).toContain('_type == "singletonReferenceBlock"');
    expect(BLOG_BY_SLUG_QUERY).toContain("singleton->site._ref == $siteId");
    expect(BLOG_BY_SLUG_QUERY).toContain("singleton->locale == $locale");
    expect(BLOG_BY_SLUG_QUERY).toContain('"component": component[0]');
  });

  it("projects the referenced component into Search so visible Singleton copy is searchable", () => {
    expect(SEARCH_CONTENT_QUERY).toContain(
      '_type == "singletonReferenceBlock"',
    );
    expect(SEARCH_CONTENT_QUERY).toContain('"singleton": select(');
    expect(SEARCH_CONTENT_QUERY).toContain('"component": component[0]{');
    expect(SEARCH_CONTENT_QUERY).toContain("singleton->site._ref == $siteId");
    expect(SEARCH_CONTENT_QUERY).toContain("singleton->locale == $locale");
  });

  it("does not recursively permit another Singleton inside the dereferenced component", () => {
    const occurrences = SINGLETON_REFERENCE_BLOCK_FRAGMENT.match(
      /_type == "singletonReferenceBlock"/g,
    );

    expect(occurrences).toHaveLength(1);
  });
});
