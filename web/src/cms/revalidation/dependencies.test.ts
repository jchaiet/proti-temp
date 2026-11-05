import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DOCUMENTS_BY_ID_QUERY,
  DYNAMIC_DOCUMENT_LIST_CONSUMERS_QUERY,
  REVERSE_DEPENDENCIES_QUERY,
  SITE_PUBLIC_ROUTE_INDEX_QUERY,
  resolveRevalidationPlan,
} from "./dependencies";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock:
    vi.fn<
      (query: string, params?: Record<string, unknown>) => Promise<unknown>
    >(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: fetchMock,
  },
}));

const siteIndex = {
  site: {
    _id: "site-a",
    defaultLocale: "en-us",
    locales: [{ code: "en-us" }, { code: "es-us" }],
  },
  pages: [
    { _id: "home", locale: "en-us", isHomepage: true },
    { _id: "page-a", locale: "en-us", slug: "products" },
  ],
  blogs: [],
  authors: [],
  taxonomy: [],
  redirects: [],
};

function mockFetch({
  reverse = [],
  indexes = { "site-a": siteIndex },
  documents = [],
  dynamicConsumers = [],
}: {
  reverse?: Array<Record<string, unknown>>;
  indexes?: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
  dynamicConsumers?: Array<Record<string, unknown>>;
} = {}) {
  fetchMock.mockImplementation(async (query, params) => {
    if (query === REVERSE_DEPENDENCIES_QUERY) {
      return reverse;
    }

    if (query === SITE_PUBLIC_ROUTE_INDEX_QUERY) {
      return (
        indexes[String(params?.siteId)] ?? {
          site: null,
          pages: [],
          blogs: [],
          authors: [],
          taxonomy: [],
          redirects: [],
        }
      );
    }

    if (query === DOCUMENTS_BY_ID_QUERY) {
      return documents;
    }

    if (query === DYNAMIC_DOCUMENT_LIST_CONSUMERS_QUERY) {
      return dynamicConsumers;
    }

    throw new Error("Unexpected query in test");
  });
}

describe("resolveRevalidationPlan", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("invalidates an existing English Page when its Spanish translation is published", async () => {
    mockFetch({
      indexes: {
        "site-a": {
          ...siteIndex,
          pages: [
            ...siteIndex.pages,
            { _id: "page-es", locale: "es-us", slug: "products" },
          ],
        },
      },
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "page-es",
        _type: "page",
        siteId: "site-a",
        locale: "es-us",
        slug: "products",
      },
    });

    expect(plan?.paths).toContain("/products");
    expect(plan?.paths).toContain("/es-us/products");
    expect(plan?.paths).toContain("/sitemap.xml");
  });

  it("invalidates the surviving Page when its translation is deleted", async () => {
    mockFetch();

    const plan = await resolveRevalidationPlan({
      before: {
        _id: "page-es",
        _type: "page",
        siteId: "site-a",
        locale: "es-us",
        slug: "products",
      },
      after: null,
    });

    expect(plan?.paths).toContain("/products");
    expect(plan?.paths).toContain("/es-us/products");
  });

  it("invalidates translated descendants when an English parent route changes", async () => {
    const translatedIndex = {
      ...siteIndex,
      pages: [
        { _id: "home-en", locale: "en-us", isHomepage: true },
        { _id: "parent-en", locale: "en-us", slug: "catalog" },
        {
          _id: "child-en",
          locale: "en-us",
          slug: "widget",
          parentId: "parent-en",
        },
        { _id: "parent-es", locale: "es-us", slug: "products" },
        {
          _id: "child-es",
          locale: "es-us",
          slug: "widget",
          parentId: "parent-es",
        },
      ],
    };
    mockFetch({ indexes: { "site-a": translatedIndex } });

    const plan = await resolveRevalidationPlan({
      before: {
        _id: "parent-en",
        _type: "page",
        siteId: "site-a",
        locale: "en-us",
        slug: "products",
      },
      after: {
        _id: "parent-en",
        _type: "page",
        siteId: "site-a",
        locale: "en-us",
        slug: "catalog",
      },
    });

    expect(plan?.paths).toContain("/es-us/products");
    expect(plan?.paths).toContain("/es-us/products/widget");
    expect(plan?.paths).toContain("/products/widget");
    expect(plan?.paths).toContain("/catalog/widget");
  });

  it("invalidates an English Blog when its Spanish counterpart is added or deleted", async () => {
    const translatedIndex = {
      ...siteIndex,
      blogs: [
        { _id: "blog-en", locale: "en-us", slug: "nutrition" },
        { _id: "blog-es", locale: "es-us", slug: "nutrition" },
      ],
    };
    mockFetch({ indexes: { "site-a": translatedIndex } });

    const added = await resolveRevalidationPlan({
      after: {
        _id: "blog-es",
        _type: "blog",
        siteId: "site-a",
        locale: "es-us",
        slug: "nutrition",
      },
    });
    const deleted = await resolveRevalidationPlan({
      before: {
        _id: "blog-es",
        _type: "blog",
        siteId: "site-a",
        locale: "es-us",
        slug: "nutrition",
      },
      after: null,
    });

    expect(added?.paths).toContain("/blog/nutrition");
    expect(deleted?.paths).toContain("/blog/nutrition");
    expect(added?.paths).toContain("/es-us/blog/nutrition");
  });

  it("invalidates both old and new Blog locale counterparts when the slug changes", async () => {
    mockFetch({
      indexes: {
        "site-a": {
          ...siteIndex,
          blogs: [
            { _id: "blog-en-old", locale: "en-us", slug: "old-slug" },
            { _id: "blog-en-new", locale: "en-us", slug: "new-slug" },
            { _id: "blog-es", locale: "es-us", slug: "new-slug" },
          ],
        },
      },
    });

    const plan = await resolveRevalidationPlan({
      before: {
        _id: "blog-es",
        _type: "blog",
        siteId: "site-a",
        locale: "es-us",
        slug: "old-slug",
      },
      after: {
        _id: "blog-es",
        _type: "blog",
        siteId: "site-a",
        locale: "es-us",
        slug: "new-slug",
      },
    });

    expect(plan?.paths).toContain("/blog/old-slug");
    expect(plan?.paths).toContain("/blog/new-slug");
    expect(plan?.paths).toContain("/es-us/blog/old-slug");
    expect(plan?.paths).toContain("/es-us/blog/new-slug");
  });

  it("revalidates Pages that consume a Singleton", async () => {
    mockFetch({
      reverse: [
        {
          _id: "page-a",
          _type: "page",
          siteId: "site-a",
          locale: "en-us",
          slug: "products",
        },
      ],
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "singleton-a",
        _type: "singleton",
        siteId: "site-a",
        locale: "en-us",
        key: "global-cta",
      },
    });

    expect(plan?.paths).toEqual(["/products"]);
  });

  it("revalidates the Site route set when a Modal changes", async () => {
    mockFetch();

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "modal-a",
        _type: "modal",
        siteId: "site-a",
        locale: "en-us",
        key: "product-details",
      },
    });

    expect(plan?.paths).toEqual(["/", "/es-us/search", "/products", "/search"]);
  });

  it("walks Header -> Navigation Set -> Site and revalidates the Site route set", async () => {
    const reverseById: Record<string, Array<Record<string, unknown>>> = {
      "header-a": [
        {
          _id: "nav-set-a",
          _type: "navigationSet",
          siteId: "site-a",
          locale: "en-us",
        },
      ],
      "nav-set-a": [
        {
          _id: "site-a",
          _type: "site",
          siteId: "site-a",
          defaultLocale: "en-us",
          locales: [{ code: "en-us" }, { code: "es-us" }],
        },
      ],
    };

    fetchMock.mockImplementation(async (query, params) => {
      if (query === REVERSE_DEPENDENCIES_QUERY) {
        return reverseById[String(params?.documentId)] ?? [];
      }

      if (query === SITE_PUBLIC_ROUTE_INDEX_QUERY) {
        return siteIndex;
      }

      if (query === DOCUMENTS_BY_ID_QUERY) {
        return [];
      }

      throw new Error("Unexpected query in test");
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "header-a",
        _type: "navigationHeader",
        siteId: "site-a",
        locale: "en-us",
      },
    });

    expect(plan?.paths).toEqual(["/", "/es-us/search", "/products", "/search"]);
  });

  it("invalidates both old and new Page hierarchies when a parent slug changes", async () => {
    const indexWithChild = {
      ...siteIndex,
      pages: [
        { _id: "home", locale: "en-us", isHomepage: true },
        { _id: "parent", locale: "en-us", slug: "catalog" },
        {
          _id: "child",
          locale: "en-us",
          slug: "widget",
          parentId: "parent",
        },
      ],
    };

    mockFetch({
      indexes: {
        "site-a": indexWithChild,
      },
    });

    const plan = await resolveRevalidationPlan({
      before: {
        _id: "parent",
        _type: "page",
        siteId: "site-a",
        locale: "en-us",
        slug: "products",
      },
      after: {
        _id: "parent",
        _type: "page",
        siteId: "site-a",
        locale: "en-us",
        slug: "catalog",
      },
    });

    expect(plan?.paths).toEqual([
      "/catalog",
      "/catalog/widget",
      "/products",
      "/products/widget",
      "/sitemap.xml",
    ]);
  });

  it("revalidates a Blog plus its Author and Taxonomy landing pages", async () => {
    const indexWithEditorialRoutes = {
      ...siteIndex,
      blogs: [
        {
          _id: "blog-a",
          locale: "en-us",
          slug: "healthy-eating",
          authorId: "author-a",
          taxonomyIds: ["taxonomy-child"],
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

    mockFetch({
      indexes: {
        "site-a": indexWithEditorialRoutes,
      },
      documents: [
        {
          _id: "author-a",
          _type: "author",
          siteId: "site-a",
          slug: "jane-doe",
        },
        {
          _id: "taxonomy-child",
          _type: "taxonomy",
          siteId: "site-a",
          slug: "nutrition",
          parentId: "taxonomy-root",
        },
      ],
    });

    const plan = await resolveRevalidationPlan({
      before: {
        _id: "blog-a",
        _type: "blog",
        siteId: "site-a",
        locale: "en-us",
        slug: "healthy-eating",
        authorId: "author-a",
        taxonomyIds: ["taxonomy-child"],
      },
      after: {
        _id: "blog-a",
        _type: "blog",
        siteId: "site-a",
        locale: "en-us",
        slug: "healthy-eating",
        authorId: "author-a",
        taxonomyIds: ["taxonomy-child"],
      },
    });

    expect(plan?.paths).toEqual([
      "/authors/jane-doe",
      "/blog/healthy-eating",
      "/blog/topics/nutrition",
      "/es-us/authors/jane-doe",
      "/es-us/blog/topics/nutrition",
      "/sitemap.xml",
    ]);
  });

  it("invalidates dynamic Page Document List consumers on Page publication", async () => {
    mockFetch({
      indexes: {
        "site-a": {
          ...siteIndex,
          pages: [
            ...siteIndex.pages,
            { _id: "page-list-host", locale: "en-us", slug: "resources" },
            { _id: "page-filtered-host", locale: "en-us", slug: "filtered" },
          ],
        },
      },
      dynamicConsumers: [
        {
          _id: "page-list-host",
          _type: "page",
          siteId: "site-a",
          locale: "en-us",
          slug: "resources",
          dynamicLists: [{ taxonomyIds: [] }],
        },
        {
          _id: "page-filtered-host",
          _type: "page",
          siteId: "site-a",
          locale: "en-us",
          slug: "filtered",
          dynamicLists: [{ taxonomyIds: ["taxonomy-tag"] }],
        },
      ],
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "page-a",
        _type: "page",
        siteId: "site-a",
        locale: "en-us",
        slug: "products",
      },
    });

    expect(plan?.paths).toContain("/products");
    expect(plan?.paths).toContain("/resources");
    expect(plan?.paths).not.toContain("/filtered");
    // A separate Page with a dynamic Page list needs refreshing even though
    // it does not reference the new Page.
    // The route index fixture must include the consumer routes.
    expect(fetchMock).toHaveBeenCalledWith(
      DYNAMIC_DOCUMENT_LIST_CONSUMERS_QUERY,
      expect.objectContaining({ changedType: "page", siteId: "site-a" }),
    );
  });

  it("revalidates Pages with matching dynamic Blog Document Lists", async () => {
    mockFetch({
      dynamicConsumers: [
        {
          _id: "page-a",
          _type: "page",
          siteId: "site-a",
          locale: "en-us",
          slug: "products",
          dynamicLists: [
            {
              taxonomyIds: ["taxonomy-child"],
              taxonomyMatchLogic: "any",
            },
          ],
        },
        {
          _id: "page-nonmatch",
          _type: "page",
          siteId: "site-a",
          locale: "en-us",
          slug: "other",
          dynamicLists: [
            {
              taxonomyIds: ["taxonomy-other"],
              taxonomyMatchLogic: "any",
            },
          ],
        },
      ],
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "blog-a",
        _type: "blog",
        siteId: "site-a",
        locale: "en-us",
        slug: "healthy-eating",
        taxonomyIds: ["taxonomy-child"],
      },
    });

    expect(plan?.paths).toContain("/products");
    expect(plan?.paths).not.toContain("/other");
  });

  it("revalidates Taxonomy landing pages when an Author used by Blogs changes", async () => {
    const indexWithEditorialRoutes = {
      ...siteIndex,
      blogs: [
        {
          _id: "blog-a",
          locale: "en-us",
          slug: "healthy-eating",
          authorId: "author-a",
          taxonomyIds: ["taxonomy-child"],
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

    mockFetch({
      reverse: [
        {
          _id: "blog-a",
          _type: "blog",
          siteId: "site-a",
          locale: "en-us",
          slug: "healthy-eating",
          authorId: "author-a",
          taxonomyIds: ["taxonomy-child"],
        },
      ],
      indexes: {
        "site-a": indexWithEditorialRoutes,
      },
      documents: [
        {
          _id: "taxonomy-child",
          _type: "taxonomy",
          siteId: "site-a",
          slug: "nutrition",
          parentId: "taxonomy-root",
        },
      ],
    });

    const plan = await resolveRevalidationPlan({
      after: {
        _id: "author-a",
        _type: "author",
        siteId: "site-a",
        slug: "jane-doe",
      },
    });

    expect(plan?.paths).toEqual([
      "/authors/jane-doe",
      "/blog/healthy-eating",
      "/blog/topics/nutrition",
      "/es-us/authors/jane-doe",
      "/es-us/blog/topics/nutrition",
      "/sitemap.xml",
    ]);
  });

  it("revalidates robots and sitemap for Site changes", async () => {
    mockFetch();

    const plan = await resolveRevalidationPlan({
      before: {
        _id: "site-a",
        _type: "site",
        defaultLocale: "en-us",
        locales: [{ code: "en-us" }, { code: "es-us" }],
      },
      after: {
        _id: "site-a",
        _type: "site",
        defaultLocale: "es-us",
        locales: [{ code: "en-us" }, { code: "es-us" }],
      },
    });

    expect(plan?.paths).toContain("/robots.txt");
    expect(plan?.paths).toContain("/sitemap.xml");
    expect(plan?.paths).toContain("/en-us/products");
    expect(plan?.paths).toContain("/products");
  });
});
