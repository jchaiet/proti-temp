import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  getDynamicDocumentListQuery: vi.fn(),
  resolveSanityImagePreset: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.fetch,
  },
}));

vi.mock("@/sanity/queries/documentList", () => ({
  getDynamicDocumentListQuery: mocks.getDynamicDocumentListQuery,
}));

vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImagePreset: mocks.resolveSanityImagePreset,
}));

import { resolveDynamicDocumentList } from "./document-list";

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.getDynamicDocumentListQuery.mockReset();
  mocks.resolveSanityImagePreset.mockReset();

  mocks.getDynamicDocumentListQuery.mockReturnValue("DOCUMENT_LIST_QUERY");

  mocks.resolveSanityImagePreset.mockImplementation(
    (_image: unknown, preset: string) => `resolved-${preset}.jpg`,
  );
});

it("short-circuits when required resolver context is missing", async () => {
  expect(
    await resolveDynamicDocumentList({
      siteId: "",
      locale: "en-us",
      contentTypes: ["blog"],
      sort: "newest",
      limit: 10,
    }),
  ).toEqual([]);

  expect(
    await resolveDynamicDocumentList({
      siteId: "site-proti",
      locale: "",
      contentTypes: ["blog"],
      sort: "newest",
      limit: 10,
    }),
  ).toEqual([]);

  expect(
    await resolveDynamicDocumentList({
      siteId: "site-proti",
      locale: "en-us",
      contentTypes: [],
      sort: "newest",
      limit: 10,
    }),
  ).toEqual([]);

  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("normalizes taxonomy draft IDs, deduplicates them, maps content types, and clamps limit", async () => {
  mocks.fetch.mockResolvedValue([]);

  await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    contentTypes: ["article", "blog", "news", "resource"],
    taxonomyIds: [
      "drafts.taxonomy-nutrition",
      "taxonomy-nutrition",
      "taxonomy-health",
      "",
    ],
    taxonomyMatchLogic: "all",
    sort: "oldest",
    limit: 999,
  });

  expect(mocks.getDynamicDocumentListQuery).toHaveBeenCalledWith("oldest");

  expect(mocks.fetch).toHaveBeenCalledWith(
    "DOCUMENT_LIST_QUERY",
    {
      siteId: "site-proti",
      locale: "en-us",
      types: ["article", "blog", "news", "resource"],
      taxonomyIds: ["taxonomy-nutrition", "taxonomy-health"],
      taxonomyMatchLogic: "all",
      limit: 200,
    },
    {
      next: {
        revalidate: false,
      },
    },
  );
});

it("maps dynamic Blog/Article/News items to Article cards and Resources to Resource cards", async () => {
  const image = {
    asset: {
      _type: "reference",
      _ref: "image-abc",
    },
    hotspot: {
      _type: "sanity.imageHotspot",
      x: 0.5,
      y: 0.5,
      width: 0.5,
      height: 0.5,
    },
  };

  mocks.fetch.mockResolvedValue([
    {
      _id: "blog-1",
      _type: "blog",
      title: "Nutrition Blog",
      summary: "A guide",
      slug: "nutrition-blog",
      date: "2026-08-31T14:17:00.000Z",
      thumbnailImage: image,
      taxonomy: [
        {
          _id: "taxonomy-nutrition",
          title: "Nutrition",
          slug: "nutrition",
        },
      ],
    },
    {
      _id: "article-1",
      _type: "article",
      title: "Nutrition Article",
      path: "articles/custom-path",
      slug: "ignored-because-path-wins",
    },
    {
      _id: "news-1",
      _type: "news",
      title: "Nutrition News",
      slug: "nutrition-news",
    },
    {
      _id: "resource-1",
      _type: "resource",
      title: "Nutrition PDF",
      slug: "nutrition-pdf",
      fileType: "PDF",
      fileSize: "2 MB",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    contentTypes: ["article", "blog", "news", "resource"],
    sort: "newest",
    limit: 20,
  });

  expect(mocks.resolveSanityImagePreset).toHaveBeenCalledWith(image, "card");

  expect(result).toEqual([
    {
      id: "blog-1",
      contentType: "blog",
      cardType: "article",
      title: "Nutrition Blog",
      summary: "A guide",
      url: "/blog/nutrition-blog",
      date: "2026-08-31T14:17:00.000Z",
      thumbnail: "resolved-card.jpg",
      thumbnailWidth: 960,
      thumbnailHeight: 540,
      tags: ["Nutrition"],
      fileType: undefined,
      fileSize: undefined,
    },
    {
      id: "article-1",
      contentType: "article",
      cardType: "article",
      title: "Nutrition Article",
      summary: undefined,
      url: "/articles/custom-path",
      date: undefined,
      thumbnail: "resolved-card.jpg",
      tags: undefined,
      fileType: undefined,
      fileSize: undefined,
    },
    {
      id: "news-1",
      contentType: "news",
      cardType: "article",
      title: "Nutrition News",
      summary: undefined,
      url: "/news/nutrition-news",
      date: undefined,
      thumbnail: "resolved-card.jpg",
      tags: undefined,
      fileType: undefined,
      fileSize: undefined,
    },
    {
      id: "resource-1",
      contentType: "resource",
      cardType: "resource",
      title: "Nutrition PDF",
      summary: undefined,
      url: "/resources/nutrition-pdf",
      date: undefined,
      thumbnail: "resolved-card.jpg",
      tags: undefined,
      fileType: "PDF",
      fileSize: "2 MB",
    },
  ]);
});

it("keeps default-locale dynamic URLs unprefixed", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "blog-en",
      _type: "blog",
      title: "Nutrition",
      slug: "nutrition",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    localePrefix: "",
    contentTypes: ["blog"],
    sort: "newest",
    limit: 10,
  });

  expect(result[0]?.url).toBe("/blog/nutrition");
});

it("prefixes slug-based dynamic URLs for a non-default locale", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "blog-es",
      _type: "blog",
      title: "Nutrición",
      slug: "nutricion",
    },
    {
      _id: "news-es",
      _type: "news",
      title: "Noticias",
      slug: "noticias",
    },
    {
      _id: "resource-es",
      _type: "resource",
      title: "Recurso",
      slug: "recurso",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "es-us",
    localePrefix: "/es-us",
    contentTypes: ["blog", "news", "resource"],
    sort: "newest",
    limit: 10,
  });

  expect(result.map((item) => item.url)).toEqual([
    "/es-us/blog/nutricion",
    "/es-us/news/noticias",
    "/es-us/resources/recurso",
  ]);
});

it("prefixes projected paths for a non-default locale", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "article-es",
      _type: "article",
      title: "Artículo",
      path: "articles/articulo",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "es-us",
    localePrefix: "/es-us",
    contentTypes: ["article"],
    sort: "newest",
    limit: 10,
  });

  expect(result[0]?.url).toBe("/es-us/articles/articulo");
});

it("does not double-prefix an already-localized projected path", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "article-es",
      _type: "article",
      title: "Artículo",
      path: "/es-us/articles/articulo",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "es-us",
    localePrefix: "/es-us",
    contentTypes: ["article"],
    sort: "newest",
    limit: 10,
  });

  expect(result[0]?.url).toBe("/es-us/articles/articulo");
});

it("drops dynamic documents that have no title", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "blog-no-title",
      _type: "blog",
      slug: "missing-title",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    contentTypes: ["blog"],
    sort: "newest",
    limit: 10,
  });

  expect(result).toEqual([]);
});

it("normalizes a projected path that does not start with /", async () => {
  mocks.fetch.mockResolvedValue([
    {
      _id: "page-like-article",
      _type: "article",
      title: "Nutrition",
      path: "nutrition/article",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    contentTypes: ["article"],
    sort: "newest",
    limit: 10,
  });

  expect(result[0]?.url).toBe("/nutrition/article");
});

/** Mimic GROQ's batched, Site/locale-scoped parent Page lookup. */
function mockDocumentListWithParents(
  documents: Array<Record<string, unknown>>,
  parents: Array<{
    _id: string;
    slug?: string;
    parentId?: string;
    isHomepage?: boolean;
    siteId?: string;
    locale?: string;
  }> = [],
) {
  mocks.fetch.mockImplementation(
    async (query: string, params?: Record<string, unknown>) => {
      if (query === "DOCUMENT_LIST_QUERY") return documents;

      if (query.includes("_id in $pageIds")) {
        const ids = params?.pageIds as string[];
        return parents.filter(
          (page) =>
            ids.includes(page._id) &&
            (page.siteId ?? "site-proti") === params?.siteId &&
            (page.locale ?? "en-us") === params?.locale,
        );
      }

      throw new Error(`Unexpected GROQ query: ${query}`);
    },
  );
}

it("resolves root, child, and grandchild Page URLs without inventing route prefixes", async () => {
  mockDocumentListWithParents([
    {
      _id: "page-root",
      _type: "page",
      title: "Products",
      slug: "products",
      path: "/stale-path",
    },
    {
      _id: "page-widget",
      _type: "page",
      title: "Widget",
      slug: "widget",
      parentId: "page-root",
    },
    {
      _id: "page-details",
      _type: "page",
      title: "Details",
      slug: "details",
      parentId: "page-widget",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    contentTypes: ["page"],
    sort: "title-asc",
    limit: 12,
  });

  expect(result.map(({ url }) => url)).toEqual([
    "/products",
    "/products/widget",
    "/products/widget/details",
  ]);
  // Every ancestor came from the initial list: no extra query needed.
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(mocks.fetch.mock.calls[0]?.[1]).toMatchObject({
    types: ["page"],
    limit: 12,
    taxonomyMatchLogic: "any",
  });
});

it("fetches shared ancestors in batches rather than once per Page", async () => {
  mockDocumentListWithParents(
    [
      {
        _id: "page-widget",
        _type: "page",
        title: "Widget",
        slug: "widget",
        parentId: "page-products",
      },
      {
        _id: "page-gadget",
        _type: "page",
        title: "Gadget",
        slug: "gadget",
        parentId: "page-products",
      },
    ],
    [
      {
        _id: "page-products",
        slug: "products",
        parentId: "page-catalog",
      },
      { _id: "page-catalog", slug: "catalog" },
    ],
  );

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    contentTypes: ["page"],
    sort: "newest",
    limit: 10,
  });

  expect(result.map(({ url }) => url)).toEqual([
    "/catalog/products/widget",
    "/catalog/products/gadget",
  ]);
  expect(mocks.fetch).toHaveBeenCalledTimes(3);
  expect(mocks.fetch.mock.calls[1]?.[1]).toEqual({
    siteId: "site-proti",
    locale: "en-us",
    pageIds: ["page-products"],
  });
  expect(mocks.fetch.mock.calls[2]?.[1]).toEqual({
    siteId: "site-proti",
    locale: "en-us",
    pageIds: ["page-catalog"],
  });
});

it("prefixes nested Pages and maps the localized homepage without a trailing slash", async () => {
  mockDocumentListWithParents(
    [
      { _id: "home-es", _type: "page", title: "Inicio", isHomepage: true },
      {
        _id: "page-widget-es",
        _type: "page",
        title: "Widget",
        slug: "widget",
        parentId: "page-products-es",
      },
      { _id: "blog-es", _type: "blog", title: "Blog", slug: "post" },
    ],
    [
      {
        _id: "page-products-es",
        slug: "products",
        locale: "es-us",
      },
    ],
  );

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "es-us",
    localePrefix: "/es-us",
    contentTypes: ["page", "blog"],
    sort: "newest",
    limit: 10,
  });

  expect(result.map(({ url }) => url)).toEqual([
    "/es-us",
    "/es-us/products/widget",
    "/es-us/blog/post",
  ]);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});

it("resolves a default-locale homepage to /", async () => {
  mockDocumentListWithParents([
    { _id: "home-en", _type: "page", title: "Home", isHomepage: true },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    localePrefix: "",
    contentTypes: ["page"],
    sort: "newest",
    limit: 10,
  });

  expect(result.map(({ url }) => url)).toEqual(["/"]);
});

it("drops Pages with missing parents or slugs rather than emitting broken links", async () => {
  mockDocumentListWithParents([
    {
      _id: "page-orphan",
      _type: "page",
      title: "Orphan",
      slug: "widget",
      path: "/outdated-path",
      parentId: "page-deleted",
    },
    { _id: "page-no-slug", _type: "page", title: "No slug" },
    { _id: "article", _type: "article", title: "Article", slug: "fine" },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    contentTypes: ["page", "article"],
    sort: "newest",
    limit: 10,
  });

  expect(result.map(({ url }) => url)).toEqual(["/articles/fine"]);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});

it.each([
  { siteId: "other-site", locale: "en-us" },
  { siteId: "site-proti", locale: "es-us" },
])(
  "rejects Page ancestors from $siteId / $locale",
  async ({ siteId, locale }) => {
    mockDocumentListWithParents(
      [
        {
          _id: "page-widget",
          _type: "page",
          title: "Widget",
          slug: "widget",
          parentId: "page-products",
        },
      ],
      [{ _id: "page-products", slug: "products", siteId, locale }],
    );

    const result = await resolveDynamicDocumentList({
      siteId: "site-proti",
      locale: "en-us",
      contentTypes: ["page"],
      sort: "newest",
      limit: 10,
    });

    expect(result).toEqual([]);
    expect(mocks.fetch.mock.calls[1]?.[0]).toContain("site._ref == $siteId");
    expect(mocks.fetch.mock.calls[1]?.[0]).toContain("locale == $locale");
  },
);

it("rejects cyclic Page parents without hanging", async () => {
  mockDocumentListWithParents([
    {
      _id: "page-a",
      _type: "page",
      title: "Page A",
      slug: "a",
      parentId: "page-b",
    },
    {
      _id: "page-b",
      _type: "page",
      title: "Page B",
      slug: "b",
      parentId: "page-a",
    },
  ]);

  const result = await resolveDynamicDocumentList({
    siteId: "site-proti",
    locale: "en-us",
    contentTypes: ["page"],
    sort: "newest",
    limit: 10,
  });

  expect(result).toEqual([]);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
