import { describe, expect, it } from "vitest";

import {
  buildAllSitePublicPaths,
  buildAffectedPagePaths,
  buildAuthorPaths,
  buildBlogPath,
  buildBlogTranslationCounterpartPaths,
  buildPageTranslationCounterpartPaths,
  buildPagePaths,
  buildTaxonomyPaths,
  type SitePublicRouteIndex,
} from "./routes";

const index: SitePublicRouteIndex = {
  site: {
    _id: "site-a",
    defaultLocale: "en-us",
    locales: [{ code: "en-us" }, { code: "es-us" }],
  },
  pages: [
    {
      _id: "home-en",
      locale: "en-us",
      isHomepage: true,
    },
    {
      _id: "products-en",
      locale: "en-us",
      slug: "products",
    },
    {
      _id: "widget-en",
      locale: "en-us",
      slug: "widget",
      parentId: "products-en",
    },
    {
      _id: "search-page",
      locale: "en-us",
      slug: "search",
    },
    {
      _id: "home-es",
      locale: "es-us",
      isHomepage: true,
    },
  ],
  blogs: [
    {
      _id: "blog-en",
      locale: "en-us",
      slug: "nutrition",
    },
    {
      _id: "blog-es",
      locale: "es-us",
      slug: "nutricion",
    },
  ],
  authors: [{ _id: "author-a", slug: "jane-doe" }],
  taxonomy: [
    { _id: "taxonomy-root", slug: "topics" },
    {
      _id: "taxonomy-child",
      slug: "nutrition",
      parentId: "taxonomy-root",
    },
  ],
};

describe("revalidation route builders", () => {
  it("invalidates only the changed Page hierarchy rather than every Page in the locale", () => {
    const movedParent = {
      _id: "products-en",
      _type: "page" as const,
      siteId: "site-a",
      locale: "en-us",
      slug: "catalog",
    };

    expect(buildAffectedPagePaths(index, movedParent)).toEqual([
      "/catalog",
      "/catalog/widget",
    ]);
  });

  it("identifies existing translated Pages when publishing a new same-path locale", () => {
    const withTranslation = {
      ...index,
      pages: [
        ...index.pages!,
        { _id: "products-es", locale: "es-us", slug: "products" },
      ],
    };

    expect(
      buildPageTranslationCounterpartPaths(withTranslation, {
        _id: "products-es",
        _type: "page",
        siteId: "site-a",
        locale: "es-us",
        slug: "products",
      }),
    ).toEqual(["/products"]);
  });

  it("matches changed parent and descendant paths to existing translated routes", () => {
    const withTranslation = {
      ...index,
      pages: [
        ...index.pages!,
        { _id: "products-es", locale: "es-us", slug: "products" },
        {
          _id: "widget-es",
          locale: "es-us",
          slug: "widget",
          parentId: "products-es",
        },
      ],
    };

    expect(
      buildPageTranslationCounterpartPaths(withTranslation, {
        _id: "products-en",
        _type: "page",
        siteId: "site-a",
        locale: "en-us",
        slug: "products",
      }),
    ).toEqual(["/es-us/products", "/es-us/products/widget"]);

    // The source parent has moved from /products to /catalog; the ES
    // counterparts at the old route must drop stale hreflang references.
    expect(
      buildPageTranslationCounterpartPaths(withTranslation, {
        _id: "products-en",
        _type: "page",
        siteId: "site-a",
        locale: "en-us",
        slug: "catalog",
      }),
    ).toEqual([]);
  });

  it("identifies same-slug Blog counterparts without invalidating unrelated Blogs", () => {
    expect(
      buildBlogTranslationCounterpartPaths(index, {
        _id: "blog-es",
        _type: "blog",
        siteId: "site-a",
        locale: "es-us",
        slug: "nutrition",
      }),
    ).toEqual(["/blog/nutrition"]);

    expect(
      buildBlogTranslationCounterpartPaths(index, {
        _id: "blog-es",
        _type: "blog",
        siteId: "site-a",
        locale: "es-us",
        slug: "unrelated",
      }),
    ).toEqual([]);
  });

  it("builds locale-aware Page paths and keeps authored Search pages", () => {
    expect(buildPagePaths(index)).toEqual([
      "/",
      "/es-us",
      "/products",
      "/products/widget",
      "/search",
    ]);
  });

  it("can reconstruct an old Page hierarchy from a webhook snapshot", () => {
    expect(
      buildPagePaths(index, {
        locale: "en-us",
        snapshot: {
          _id: "products-en",
          _type: "page",
          siteId: "site-a",
          locale: "en-us",
          slug: "catalog",
          isHomepage: false,
        },
      }),
    ).toEqual(["/", "/catalog", "/catalog/widget", "/search"]);
  });

  it("builds Blog and Author paths with the default locale unprefixed", () => {
    expect(
      buildBlogPath(
        {
          locale: "es-us",
          slug: "nutrition",
        },
        "en-us",
      ),
    ).toBe("/es-us/blog/nutrition");

    expect(
      buildAuthorPaths("jane-doe", "en-us", [
        { code: "en-us" },
        { code: "es-us" },
      ]),
    ).toEqual(["/authors/jane-doe", "/es-us/authors/jane-doe"]);
  });

  it("only exposes taxonomy paths with at least root + child segments", () => {
    expect(buildTaxonomyPaths(index)).toEqual([
      "/blog/topics/nutrition",
      "/es-us/blog/topics/nutrition",
    ]);
  });

  it("builds the public route set needed by a Site/default Navigation invalidation", () => {
    expect(buildAllSitePublicPaths(index)).toEqual([
      "/",
      "/authors/jane-doe",
      "/blog/nutrition",
      "/blog/topics/nutrition",
      "/es-us",
      "/es-us/authors/jane-doe",
      "/es-us/blog/nutricion",
      "/es-us/blog/topics/nutrition",
      "/es-us/search",
      "/products",
      "/products/widget",
      "/search",
    ]);
  });
});
