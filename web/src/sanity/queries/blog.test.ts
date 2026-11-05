import { describe, expect, it } from "vitest";

import { BLOG_BY_SLUG_QUERY } from "./blog";

describe("BLOG_BY_SLUG_QUERY editorial contract", () => {
  it("projects explicit editorial dates, reviewer identity, sources, and author expertise", () => {
    expect(BLOG_BY_SLUG_QUERY).toContain("lastModifiedAt");
    expect(BLOG_BY_SLUG_QUERY).toContain("reviewedAt");
    expect(BLOG_BY_SLUG_QUERY).toContain('"reviewer": reviewer->{');
    expect(BLOG_BY_SLUG_QUERY).toContain("sources[]{");
    expect(BLOG_BY_SLUG_QUERY).toContain('"expertise": coalesce(');
    expect(BLOG_BY_SLUG_QUERY).toContain("credentials[]{");
    expect(BLOG_BY_SLUG_QUERY).toContain('"affiliation": select(');
    expect(BLOG_BY_SLUG_QUERY).toContain(
      '"defaultLocale": site->defaultLocale',
    );
    expect(BLOG_BY_SLUG_QUERY).toContain(
      '"translatedLocales": translations[defined(name) && name != ""].locale',
    );
  });

  it("defaults visible Summary display to off for existing Blogs", () => {
    expect(BLOG_BY_SLUG_QUERY).toContain(
      '"showSummaryInArticle": coalesce(showSummaryInArticle, false)',
    );
  });
});
