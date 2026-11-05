import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    withConfig: () => ({
      fetch: mocks.fetch,
    }),
  },
}));

import {
  buildRobotsConfig,
  buildSiteSitemap,
  resolveSearchSiteByHost,
} from "./search-engine";

type FixtureState = {
  site: Record<string, unknown> | null;
  pages: Array<Record<string, unknown>>;
  blogs: Array<Record<string, unknown>>;
  taxonomy: Array<Record<string, unknown>>;
  authors: Array<Record<string, unknown>>;
};

let state: FixtureState;

function installFetchMock() {
  mocks.fetch.mockImplementation(async (query: string) => {
    if (query.includes("$host in domains")) {
      return state.site;
    }

    if (query.includes('_type == "page"')) {
      return state.pages;
    }

    if (query.includes('_type == "blog"')) {
      return state.blogs;
    }

    if (query.includes('_type == "taxonomy"')) {
      return state.taxonomy;
    }

    if (query.includes('_type == "author"')) {
      return state.authors;
    }

    throw new Error(`Unexpected search-engine query: ${query.slice(0, 120)}`);
  });
}

beforeEach(() => {
  mocks.fetch.mockReset();

  state = {
    site: {
      _id: "site-proti",
      name: "Proti",
      domains: ["www.example.com", "example.com"],
      canonicalDomain: "example.com",
      defaultLocale: "en-us",
      locales: [
        {
          code: "en-us",
        },
        {
          code: "es-us",
        },
        {
          code: "fr-ca",
        },
      ],
      seoDefaults: [
        {
          locale: "en-us",
          indexing: "index",
        },
        {
          locale: "es-us",
          indexing: "index",
        },
        {
          locale: "fr-ca",
          indexing: "noindex",
        },
      ],
    },
    pages: [],
    blogs: [],
    taxonomy: [],
    authors: [],
  };

  installFetchMock();
});

it("normalizes host/hostname when resolving a Site", async () => {
  await resolveSearchSiteByHost("EXAMPLE.COM:443");

  expect(mocks.fetch).toHaveBeenCalledWith(
    expect.stringContaining("$host in domains"),
    {
      host: "example.com:443",
      hostname: "example.com",
    },
    {
      next: {
        revalidate: false,
      },
    },
  );
});

it("returns an empty sitemap for an unknown Site or Site without an origin", async () => {
  state.site = null;

  await expect(buildSiteSitemap("unknown.example.com")).resolves.toEqual([]);

  state.site = {
    _id: "site-no-domain",
    defaultLocale: "en-us",
    locales: [
      {
        code: "en-us",
      },
    ],
    domains: [],
  };

  await expect(buildSiteSitemap("example.com")).resolves.toEqual([]);
});

it("emits indexable Page/Blog, shared Taxonomy, and shared Author URLs using locale rules", async () => {
  state.pages = [
    {
      _id: "home-en",
      _updatedAt: "2026-09-01T12:00:00Z",
      locale: "en-us",
      isHomepage: true,
    },
    {
      _id: "home-es",
      locale: "es-us",
      isHomepage: true,
    },
    {
      _id: "page-en",
      locale: "en-us",
      slug: "products",
      seo: {
        indexing: "inherit",
      },
    },
    {
      _id: "page-es",
      locale: "es-us",
      slug: "productos",
    },
    {
      _id: "page-fr",
      locale: "fr-ca",
      slug: "produits",
    },
    {
      _id: "page-unsupported",
      locale: "uk-en",
      slug: "unsupported",
    },
  ];

  state.blogs = [
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
    {
      _id: "blog-fr",
      locale: "fr-ca",
      slug: "nutrition-fr",
    },
  ];

  state.taxonomy = [
    {
      _id: "taxonomy-root",
      slug: "topics",
    },
    {
      _id: "taxonomy-child",
      slug: "nutrition",
      parentId: "taxonomy-root",
    },
  ];

  state.authors = [
    {
      _id: "author-jane",
      slug: "jane-smith",
      translations: [
        {
          locale: "es-us",
          name: "Juana Smith",
        },
      ],
    },
  ];

  const sitemap = await buildSiteSitemap("example.com");

  const urls = sitemap.map((entry) => entry.url);

  expect(urls).toEqual(
    expect.arrayContaining([
      "https://example.com/",
      "https://example.com/es-us",
      "https://example.com/products",
      "https://example.com/es-us/productos",
      "https://example.com/blog/nutrition",
      "https://example.com/es-us/blog/nutricion",
      "https://example.com/blog/topics/nutrition",
      "https://example.com/es-us/blog/topics/nutrition",
      "https://example.com/authors/jane-smith",
      "https://example.com/es-us/authors/jane-smith",
    ]),
  );

  expect(urls).not.toEqual(
    expect.arrayContaining([
      "https://example.com/fr-ca/produits",
      "https://example.com/fr-ca/blog/nutrition-fr",
      "https://example.com/fr-ca/blog/topics/nutrition",
      "https://example.com/fr-ca/authors/jane-smith",
      "https://example.com/uk-en/unsupported",
      "https://example.com/blog/topics",
    ]),
  );

  const homepage = sitemap.find(
    (entry) => entry.url === "https://example.com/",
  );

  expect(homepage?.lastModified).toEqual(new Date("2026-09-01T12:00:00Z"));
});

it("only emits non-default Author routes when localized Author content exists", async () => {
  state.authors = [
    {
      _id: "author-default-only",
      slug: "default-only",
      translations: [],
    },
    {
      _id: "author-spanish",
      slug: "spanish",
      translations: [
        { locale: "es-us", name: "Autora" },
        { locale: "fr-ca", name: "" },
      ],
    },
  ];

  const urls = (await buildSiteSitemap("example.com")).map(
    (entry) => entry.url,
  );

  expect(urls).toContain("https://example.com/authors/default-only");
  expect(urls).not.toContain("https://example.com/es-us/authors/default-only");

  expect(urls).toContain("https://example.com/authors/spanish");
  expect(urls).toContain("https://example.com/es-us/authors/spanish");
  expect(urls).not.toContain("https://example.com/fr-ca/authors/spanish");
});

it("prefers the Blog editorial lastModifiedAt value for sitemap lastModified", async () => {
  state.blogs = [
    {
      _id: "blog-updated",
      _updatedAt: "2026-09-24T12:00:00Z",
      lastModifiedAt: "2026-09-20T15:30:00Z",
      locale: "en-us",
      slug: "updated-article",
    },
  ];

  const sitemap = await buildSiteSitemap("example.com");

  const entry = sitemap.find(
    (item) => item.url === "https://example.com/blog/updated-article",
  );

  expect(entry?.lastModified).toEqual(new Date("2026-09-20T15:30:00Z"));
});

it("honors Page/Blog noindex overrides even when the locale default is index", async () => {
  state.pages = [
    {
      _id: "page-private",
      locale: "en-us",
      slug: "private",
      seo: {
        indexing: "noindex",
      },
    },
    {
      _id: "page-public",
      locale: "en-us",
      slug: "public",
      seo: {
        indexing: "index",
      },
    },
  ];

  state.blogs = [
    {
      _id: "blog-private",
      locale: "en-us",
      slug: "private-blog",
      seo: {
        indexing: "noindex",
      },
    },
    {
      _id: "blog-public",
      locale: "en-us",
      slug: "public-blog",
    },
  ];

  const urls = (await buildSiteSitemap("example.com")).map(
    (entry) => entry.url,
  );

  expect(urls).toContain("https://example.com/public");
  expect(urls).toContain("https://example.com/blog/public-blog");

  expect(urls).not.toContain("https://example.com/private");
  expect(urls).not.toContain("https://example.com/blog/private-blog");
});

it("excludes non-matching canonical duplicates but accepts trailing-slash equivalent canonicals", async () => {
  state.pages = [
    {
      _id: "page-good-canonical",
      locale: "en-us",
      slug: "nutrition",
      seo: {
        canonicalUrl: "https://example.com/nutrition/",
      },
    },
    {
      _id: "page-other-canonical",
      locale: "en-us",
      slug: "duplicate",
      seo: {
        canonicalUrl: "https://example.com/canonical-owner",
      },
    },
  ];

  const urls = (await buildSiteSitemap("example.com")).map(
    (entry) => entry.url,
  );

  expect(urls).toContain("https://example.com/nutrition");
  expect(urls).not.toContain("https://example.com/duplicate");
});

it("omits malformed Page hierarchies instead of emitting broken URLs", async () => {
  state.pages = [
    {
      _id: "page-missing-parent",
      locale: "en-us",
      slug: "child",
      parentId: "does-not-exist",
    },
    {
      _id: "page-a",
      locale: "en-us",
      slug: "a",
      parentId: "page-b",
    },
    {
      _id: "page-b",
      locale: "en-us",
      slug: "b",
      parentId: "page-a",
    },
  ];

  await expect(buildSiteSitemap("example.com")).resolves.toEqual([]);
});

it("omits Page routes that cannot resolve under the runtime route contract", async () => {
  state.pages = [
    {
      _id: "home-en",
      locale: "en-us",
      isHomepage: true,
    },
    {
      _id: "parent-es",
      locale: "es-us",
      slug: "productos",
    },
    {
      _id: "wrong-locale-child",
      locale: "en-us",
      slug: "widget",
      parentId: "parent-es",
    },
    {
      _id: "homepage-child",
      locale: "en-us",
      slug: "hidden",
      parentId: "home-en",
    },
    {
      _id: "search-page",
      locale: "en-us",
      slug: "search",
    },
    {
      _id: "blog-root",
      locale: "en-us",
      slug: "blog",
    },
    {
      _id: "blog-child",
      locale: "en-us",
      slug: "article",
      parentId: "blog-root",
    },
  ];

  const urls = (await buildSiteSitemap("example.com")).map(
    (entry) => entry.url,
  );

  expect(urls).toContain("https://example.com/");
  expect(urls).toContain("https://example.com/blog");

  expect(urls).not.toContain("https://example.com/productos/widget");
  expect(urls).not.toContain("https://example.com/hidden");
  expect(urls).toContain("https://example.com/search");
  expect(urls).not.toContain("https://example.com/blog/article");
});

it("deduplicates accidental duplicate URLs", async () => {
  state.blogs = [
    {
      _id: "blog-1",
      locale: "en-us",
      slug: "nutrition",
    },
    {
      _id: "blog-2",
      locale: "en-us",
      slug: "nutrition",
    },
  ];

  const sitemap = await buildSiteSitemap("example.com");

  expect(
    sitemap.filter(
      (entry) => entry.url === "https://example.com/blog/nutrition",
    ),
  ).toHaveLength(1);
});

it("uses canonicalDomain for sitemap and robots output even when requested through an alias", async () => {
  state.site = {
    ...state.site,
    domains: ["www.example.com", "example.com"],
    canonicalDomain: "example.com",
  };

  state.pages = [
    {
      _id: "home-en",
      locale: "en-us",
      isHomepage: true,
    },
  ];

  const sitemap = await buildSiteSitemap("www.example.com");

  expect(sitemap[0]?.url).toBe("https://example.com/");

  await expect(buildRobotsConfig("www.example.com")).resolves.toEqual({
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://example.com/sitemap.xml",
  });
});

it("allows crawling on a configured host and advertises its sitemap", async () => {
  await expect(buildRobotsConfig("example.com")).resolves.toEqual({
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://example.com/sitemap.xml",
  });
});

it("disallows crawling for unknown hosts or Sites without an origin", async () => {
  state.site = null;

  await expect(buildRobotsConfig("unknown.example.com")).resolves.toEqual({
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  });

  state.site = {
    _id: "site-no-domain",
    defaultLocale: "en-us",
    domains: [],
  };

  await expect(buildRobotsConfig("example.com")).resolves.toEqual({
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  });
});
