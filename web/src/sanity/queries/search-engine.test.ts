import { describe, expect, it } from "vitest";

import { SITE_SEO_QUERY } from "./seo";
import {
  SEARCH_SITE_BY_HOST_QUERY,
  SITEMAP_AUTHORS_QUERY,
  SITEMAP_BLOGS_QUERY,
  SITEMAP_PAGES_QUERY,
  SITEMAP_TAXONOMY_QUERY,
} from "./search-engine";

describe("SEO GROQ contracts", () => {
  it("resolves Site SEO defaults for only the active locale", () => {
    expect(SITE_SEO_QUERY).toContain(
      '"defaults": seoDefaults[\n      locale == $locale\n    ][0]',
    );
  });

  it("projects the full Site social image object rather than asset->url", () => {
    expect(SITE_SEO_QUERY).toContain("socialImage {");
    expect(SITE_SEO_QUERY).not.toContain("asset->url");
    expect(SITE_SEO_QUERY).toContain("canonicalDomain");
  });
});

describe("sitemap/search-engine GROQ contracts", () => {
  it("resolves Site by host or hostname and includes locale SEO defaults", () => {
    expect(SEARCH_SITE_BY_HOST_QUERY).toContain("$host in domains");
    expect(SEARCH_SITE_BY_HOST_QUERY).toContain("$hostname in domains");
    expect(SEARCH_SITE_BY_HOST_QUERY).toContain("seoDefaults[]{");
    expect(SEARCH_SITE_BY_HOST_QUERY).toContain("indexing");
    expect(SEARCH_SITE_BY_HOST_QUERY).toContain("canonicalDomain");
  });

  it("keeps Pages and Blogs Site-scoped while projecting document SEO", () => {
    expect(SITEMAP_PAGES_QUERY).toContain("site._ref == $siteId");
    expect(SITEMAP_PAGES_QUERY).toContain("canonicalUrl");
    expect(SITEMAP_PAGES_QUERY).toContain("indexing");

    expect(SITEMAP_BLOGS_QUERY).toContain("site._ref == $siteId");
    expect(SITEMAP_BLOGS_QUERY).toContain("canonicalUrl");
    expect(SITEMAP_BLOGS_QUERY).toContain("indexing");
  });

  it("keeps shared Taxonomy and Author sitemap queries Site-scoped, not locale-scoped", () => {
    expect(SITEMAP_TAXONOMY_QUERY).toContain("site._ref == $siteId");
    expect(SITEMAP_TAXONOMY_QUERY).not.toContain("locale == $locale");

    expect(SITEMAP_AUTHORS_QUERY).toContain("site._ref == $siteId");
    expect(SITEMAP_AUTHORS_QUERY).not.toContain("locale == $locale");
    expect(SITEMAP_AUTHORS_QUERY).toContain("translations[]{");
    expect(SITEMAP_AUTHORS_QUERY).toContain("locale");
    expect(SITEMAP_AUTHORS_QUERY).toContain("name");
  });

  it("projects the editorial Blog lastModifiedAt field for sitemap accuracy", () => {
    expect(SITEMAP_BLOGS_QUERY).toContain("lastModifiedAt");
  });
});
