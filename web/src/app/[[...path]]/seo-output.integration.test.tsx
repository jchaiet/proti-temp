import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headersGet: vi.fn(),
  draftMode: vi.fn(),

  sanityFetch: vi.fn(),

  resolveSiteByHostCached: vi.fn(),
  resolvePageBySegments: vi.fn(),

  getAuthorSlug: vi.fn(),
  getBlogSlug: vi.fn(),
  getBlogTaxonomySegments: vi.fn(),
  resolveRoute: vi.fn(),

  getAuthorBySlug: vi.fn(),
  buildAuthorLocaleLinks: vi.fn(),

  getBlogBySlug: vi.fn(),

  getBlogTaxonomyPage: vi.fn(),
  buildBlogTaxonomyLocaleLinks: vi.fn(),

  resolveDocumentTranslations: vi.fn(),
  resolveStructuredDataSite: vi.fn(),

  resolveSanityImagePreset: vi.fn(),

  notFound: vi.fn(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: mocks.headersGet,
  }),
  draftMode: mocks.draftMode,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.sanityFetch,
  },
}));

vi.mock("@/sanity/queries/site", () => ({
  resolveSiteByHostCached: mocks.resolveSiteByHostCached,
}));

vi.mock("@/sanity/queries/page", () => ({
  resolvePageBySegments: mocks.resolvePageBySegments,
}));

vi.mock("@/cms/resolvers/route", () => ({
  getAuthorSlug: mocks.getAuthorSlug,
  getBlogSlug: mocks.getBlogSlug,
  getBlogTaxonomySegments: mocks.getBlogTaxonomySegments,
  resolveRoute: mocks.resolveRoute,
}));

vi.mock("@/cms/resolvers/author", () => ({
  getAuthorBySlug: mocks.getAuthorBySlug,
  buildAuthorLocaleLinks: mocks.buildAuthorLocaleLinks,
}));

vi.mock("@/cms/resolvers/blog", () => ({
  getBlogBySlug: mocks.getBlogBySlug,
}));

vi.mock("@/cms/resolvers/blog-taxonomy", () => ({
  getBlogTaxonomyPage: mocks.getBlogTaxonomyPage,
  buildBlogTaxonomyLocaleLinks: mocks.buildBlogTaxonomyLocaleLinks,
}));

vi.mock("@/cms/resolvers/translation", () => ({
  resolveDocumentTranslations: mocks.resolveDocumentTranslations,
}));

vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImagePreset: mocks.resolveSanityImagePreset,
}));

vi.mock("@/cms/resolvers/structured-data", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/cms/resolvers/structured-data")>();

  return {
    ...actual,
    resolveStructuredDataSite: mocks.resolveStructuredDataSite,
  };
});

/*
 * Keep the route's actual StructuredData component, metadata resolver,
 * URL helpers, locale helpers, and structured-data builders in this test.
 * Only visual/content components are replaced so the test can focus on the
 * final SEO output contract without pulling Mino UI/CSS into server rendering.
 */
vi.mock("@/components/SiteLayout", () => ({
  SiteLayout: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/BlockRenderer", () => ({
  BlockRenderer: () => <div data-testid="block-renderer" />,
}));

vi.mock("@/components/Author/AuthorTemplate", () => ({
  AuthorTemplate: () => <div data-testid="author-template" />,
}));

vi.mock("@/components/Blog/BlogTemplate", () => ({
  BlogTemplate: () => <div data-testid="blog-template" />,
}));

vi.mock("@/components/Blog/BlogTaxonomyTemplate", () => ({
  BlogTaxonomyTemplate: () => <div data-testid="taxonomy-template" />,
}));

import Page, { generateMetadata } from "./page";

const site = {
  _id: "site-proti",
  name: "Proti",
  key: "proti",
  domains: ["www.example.com", "example.com"],
  canonicalDomain: "example.com",
  defaultLocale: "en-us",
  locales: [
    {
      code: "en-us",
      label: "English",
    },
    {
      code: "es-us",
      label: "Español",
    },
  ],
};

const structuredSite = {
  name: "Proti",
  origin: "https://example.com",
  locales: ["en-us", "es-us"],
  organization: {
    name: "Proti Health",
    legalName: "Proti Health, Inc.",
    description: "Health information from Proti.",
  },
};

const englishTranslations = {
  localeHrefs: {
    "en-us": "/products/widget",
    "es-us": "/es-us/products/widget",
  },
  languageAlternates: {
    "en-US": "https://example.com/products/widget",
    "es-US": "https://example.com/es-us/products/widget",
    "x-default": "https://example.com/products/widget",
  },
};

const spanishTranslations = {
  localeHrefs: {
    "en-us": "/products/widget",
    "es-us": "/es-us/products/widget",
  },
  languageAlternates: {
    "en-US": "https://example.com/products/widget",
    "es-US": "https://example.com/es-us/products/widget",
    "x-default": "https://example.com/products/widget",
  },
};

const author = {
  _id: "author-jane",
  _type: "author" as const,
  _createdAt: "2026-01-15T12:00:00Z",
  _updatedAt: "2026-09-30T16:00:00Z",
  siteId: "site-proti",
  slug: "jane-smith",
  name: "Jane Smith",
  jobTitle: "Registered Dietitian",
  bio: "Nutrition expert.",
  expertise: ["Nutrition", "Metabolic health"],
  credentials: [
    {
      name: "Registered Dietitian Nutritionist",
      category: "Registration",
      identifier: "RDN-123",
      recognizedBy: "Commission on Dietetic Registration",
    },
  ],
  imageUrl: "https://cdn.example.com/jane.jpg",
  imageAlt: "Jane Smith",
  availableLocales: ["en-us", "es-us"],
  sameAs: ["https://www.linkedin.com/in/jane-smith"],
};

const reviewer = {
  _id: "author-reviewer",
  _type: "author" as const,
  siteId: "site-proti",
  slug: "alex-reviewer",
  name: "Alex Reviewer",
  jobTitle: "Medical Reviewer",
  bio: "Clinical reviewer.",
  availableLocales: ["en-us", "es-us"],
};

const blog = {
  _id: "blog-nutrition",
  _type: "blog" as const,
  siteId: "site-proti",
  locale: "en-us",
  title: "Nutrition Basics",
  summary: "A practical guide to nutrition.",
  slug: "nutrition-basics",
  publishedAt: "2026-09-01T12:00:00Z",
  lastModifiedAt: "2026-09-21T15:30:00Z",
  reviewedAt: "2026-09-22T08:00:00Z",
  imageUrl: "https://cdn.example.com/nutrition.jpg",
  imageAlt: "Healthy food",
  author,
  reviewer,
  sources: [
    {
      title: "Nutrition Guidelines",
      publisher: "Example Health Organization",
      publicationDate: "2026-08-01",
      url: "https://example.org/guidelines",
    },
  ],
  taxonomy: [
    {
      _id: "taxonomy-nutrition",
      _type: "taxonomy" as const,
      title: "Nutrition",
      slug: "nutrition",
    },
    {
      _id: "taxonomy-metabolic-health",
      _type: "taxonomy" as const,
      title: "Metabolic Health",
      slug: "metabolic-health",
    },
  ],
};

function createSiteSeoRecord(locale: string) {
  const spanish = locale === "es-us";

  return {
    _id: "site-proti",
    name: "Proti",
    domains: ["www.example.com", "example.com"],
    canonicalDomain: "example.com",
    defaultLocale: "en-us",
    defaults: {
      locale,
      siteTitle: spanish ? "Proti Salud" : "Proti Health",
      titleTemplate: spanish ? "%s | Proti Salud" : "%s | Proti Health",
      metaDescription: spanish
        ? "Descripción predeterminada del sitio."
        : "Default site description.",
      indexing: "index",
      following: "follow",
    },
  };
}

function pageProps(path: string[]) {
  return {
    params: Promise.resolve({ path }),
    searchParams: Promise.resolve({}),
  };
}

function getJsonLdGraph(html: string): Array<Record<string, unknown>> {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );

  expect(match).not.toBeNull();

  const parsed = JSON.parse(match?.[1] ?? "{}") as {
    "@graph"?: Array<Record<string, unknown>>;
  };

  expect(parsed["@graph"]).toBeDefined();

  return parsed["@graph"] ?? [];
}

function getGraphNode(
  graph: Array<Record<string, unknown>>,
  type: string,
): Record<string, unknown> {
  const node = graph.find((item) => item["@type"] === type);

  expect(node, `Expected JSON-LD graph to contain ${type}`).toBeDefined();

  return node ?? {};
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.headersGet.mockImplementation((name: string) =>
    name === "host" ? "www.example.com" : null,
  );

  mocks.draftMode.mockResolvedValue({ isEnabled: false });

  mocks.resolveSiteByHostCached.mockResolvedValue(site);

  mocks.getAuthorSlug.mockReturnValue(null);
  mocks.getBlogSlug.mockReturnValue(null);
  mocks.getBlogTaxonomySegments.mockReturnValue(null);

  mocks.resolveDocumentTranslations.mockResolvedValue(englishTranslations);

  mocks.buildAuthorLocaleLinks.mockReturnValue({
    localeHrefs: {
      "en-us": "/authors/jane-smith",
      "es-us": "/es-us/authors/jane-smith",
    },
    languageAlternates: {
      "en-US": "https://example.com/authors/jane-smith",
      "es-US": "https://example.com/es-us/authors/jane-smith",
      "x-default": "https://example.com/authors/jane-smith",
    },
  });

  mocks.resolveStructuredDataSite.mockResolvedValue(structuredSite);

  mocks.resolveSanityImagePreset.mockReturnValue(undefined);

  mocks.sanityFetch.mockImplementation(
    (_query: string, params?: Record<string, unknown>) =>
      Promise.resolve(createSiteSeoRecord(String(params?.locale ?? "en-us"))),
  );

  mocks.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });

  mocks.redirect.mockImplementation((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  });

  mocks.permanentRedirect.mockImplementation((destination: string) => {
    throw new Error(`NEXT_PERMANENT_REDIRECT:${destination}`);
  });
});

describe("rendered SEO metadata output", () => {
  it("inherits Site + Locale SEO defaults on an unprefixed default-locale Page", async () => {
    mocks.resolvePageBySegments.mockResolvedValue({
      _id: "page-widget",
      title: "Widget",
      locale: "en-us",
    });

    const metadata = await generateMetadata(pageProps(["products", "widget"]));

    expect(metadata).toMatchObject({
      title: "Widget | Proti Health",
      description: "Default site description.",
      alternates: {
        canonical: "https://example.com/products/widget",
        languages: englishTranslations.languageAlternates,
      },
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        type: "website",
        url: "https://example.com/products/widget",
        locale: "en_US",
        alternateLocale: ["es_US"],
      },
    });
  });

  it("uses localized page copy when both page SEO and Site defaults lack a description", async () => {
    const defaultRecord = createSiteSeoRecord("en-us");

    mocks.sanityFetch.mockResolvedValueOnce({
      ...defaultRecord,
      defaults: {
        ...defaultRecord.defaults,
        metaDescription: undefined,
      },
    });

    mocks.resolvePageBySegments.mockResolvedValue({
      _id: "page-widget",
      title: "Widget",
      locale: "en-us",
      sections: [
        {
          _key: "hero",
          _type: "heroBlock",
          heading: {
            description: [
              {
                _key: "copy",
                _type: "block",
                style: "normal",
                markDefs: [],
                children: [
                  {
                    _key: "text",
                    _type: "span",
                    text: "Explore the widget and its features.",
                    marks: [],
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    const metadata = await generateMetadata(pageProps(["products", "widget"]));

    expect(metadata.description).toBe("Explore the widget and its features.");
    expect(metadata.openGraph).toMatchObject({
      description: "Explore the widget and its features.",
    });
    expect(metadata.twitter).toMatchObject({
      description: "Explore the widget and its features.",
    });
  });

  it("emits localized canonical, hreflang, robots, Open Graph, and Twitter metadata for a translated Page", async () => {
    mocks.resolvePageBySegments.mockResolvedValue({
      _id: "page-widget-es",
      title: "Widget",
      locale: "es-us",
      seo: {
        metaTitle: "Widget en Español",
        metaDescription: "Descripción del widget.",
      },
    });

    mocks.resolveDocumentTranslations.mockResolvedValue(spanishTranslations);

    const metadata = await generateMetadata(
      pageProps(["es-us", "products", "widget"]),
    );

    expect(metadata).toMatchObject({
      title: "Widget en Español | Proti Salud",
      description: "Descripción del widget.",
      alternates: {
        canonical: "https://example.com/es-us/products/widget",
        languages: spanishTranslations.languageAlternates,
      },
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        type: "website",
        title: "Widget en Español | Proti Salud",
        description: "Descripción del widget.",
        url: "https://example.com/es-us/products/widget",
        locale: "es_US",
        alternateLocale: ["en_US"],
      },
      twitter: {
        card: "summary",
        title: "Widget en Español | Proti Salud",
        description: "Descripción del widget.",
      },
    });
  });

  it("suppresses hreflang when a Page canonicals elsewhere and honors explicit noindex/nofollow", async () => {
    mocks.resolvePageBySegments.mockResolvedValue({
      _id: "page-widget",
      title: "Widget",
      locale: "en-us",
      seo: {
        metaTitle: "Canonical Widget",
        canonicalUrl: "https://canonical.example.org/widget",
        indexing: "noindex",
        following: "nofollow",
      },
    });

    const metadata = await generateMetadata(pageProps(["products", "widget"]));

    expect(metadata.alternates).toEqual({
      canonical: "https://canonical.example.org/widget",
    });

    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
    });

    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: "https://canonical.example.org/widget",
    });
  });

  it("noindexes a non-default Author route when that Author has no localized profile", async () => {
    mocks.getAuthorSlug.mockReturnValue("jane-smith");

    mocks.getAuthorBySlug.mockResolvedValue({
      ...author,
      availableLocales: ["en-us"],
    });

    mocks.buildAuthorLocaleLinks.mockReturnValue({
      localeHrefs: {
        "en-us": "/authors/jane-smith",
      },
      languageAlternates: {
        "en-US": "https://example.com/authors/jane-smith",
        "x-default": "https://example.com/authors/jane-smith",
      },
    });

    const metadata = await generateMetadata(
      pageProps(["es-us", "authors", "jane-smith"]),
    );

    expect(mocks.buildAuthorLocaleLinks).toHaveBeenCalledWith({
      slug: "jane-smith",
      defaultLocale: "en-us",
      locales: site.locales,
      domains: site.domains,
      canonicalDomain: "example.com",
      availableLocales: ["en-us"],
    });

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://example.com/es-us/authors/jane-smith",
        languages: {
          "en-US": "https://example.com/authors/jane-smith",
          "x-default": "https://example.com/authors/jane-smith",
        },
      },
      robots: {
        index: false,
        follow: true,
      },
    });
  });

  it("emits article metadata with editorial dates, Author URL, and taxonomy tags for Blog routes", async () => {
    mocks.getBlogSlug.mockReturnValue("nutrition-basics");
    mocks.getBlogBySlug.mockResolvedValue(blog);
    mocks.resolveDocumentTranslations.mockResolvedValue({
      localeHrefs: {
        "en-us": "/blog/nutrition-basics",
        "es-us": "/es-us/blog/nutrition-basics",
      },
      languageAlternates: {
        "en-US": "https://example.com/blog/nutrition-basics",
        "es-US": "https://example.com/es-us/blog/nutrition-basics",
        "x-default": "https://example.com/blog/nutrition-basics",
      },
    });

    const metadata = await generateMetadata(
      pageProps(["blog", "nutrition-basics"]),
    );

    expect(metadata).toMatchObject({
      title: "Nutrition Basics | Proti Health",
      description: "A practical guide to nutrition.",
      alternates: {
        canonical: "https://example.com/blog/nutrition-basics",
      },
      openGraph: {
        type: "article",
        url: "https://example.com/blog/nutrition-basics",
        publishedTime: "2026-09-01T12:00:00Z",
        modifiedTime: "2026-09-21T15:30:00Z",
        authors: ["https://example.com/authors/jane-smith"],
        tags: ["Nutrition", "Metabolic Health"],
      },
      twitter: {
        card: "summary_large_image",
        images: ["https://cdn.example.com/nutrition.jpg"],
      },
    });
  });

  it("falls back to the default-locale Author profile URL in translated Blog metadata when the Author is not translated", async () => {
    mocks.getBlogSlug.mockReturnValue("nutrition-basics");
    mocks.getBlogBySlug.mockResolvedValue({
      ...blog,
      locale: "es-us",
      title: "Conceptos básicos de nutrición",
      author: {
        ...author,
        availableLocales: ["en-us"],
      },
    });

    mocks.resolveDocumentTranslations.mockResolvedValue({
      localeHrefs: {
        "en-us": "/blog/nutrition-basics",
        "es-us": "/es-us/blog/nutrition-basics",
      },
      languageAlternates: {
        "en-US": "https://example.com/blog/nutrition-basics",
        "es-US": "https://example.com/es-us/blog/nutrition-basics",
        "x-default": "https://example.com/blog/nutrition-basics",
      },
    });

    const metadata = await generateMetadata(
      pageProps(["es-us", "blog", "nutrition-basics"]),
    );

    expect(metadata.openGraph).toMatchObject({
      type: "article",
      url: "https://example.com/es-us/blog/nutrition-basics",
      authors: ["https://example.com/authors/jane-smith"],
    });
  });

  it("uses normal authored Page metadata for /search", async () => {
    mocks.resolvePageBySegments.mockResolvedValue({
      _id: "page-search",
      title: "Search",
      locale: "en-us",
      seo: {
        metaTitle: "Search the site",
        metaDescription: "Find pages, articles, and other content.",
      },
    });

    mocks.resolveDocumentTranslations.mockResolvedValue({
      localeHrefs: {
        "en-us": "/search",
        "es-us": "/es-us/search",
      },
      languageAlternates: {
        "en-US": "https://example.com/search",
        "es-US": "https://example.com/es-us/search",
        "x-default": "https://example.com/search",
      },
    });

    const metadata = await generateMetadata(pageProps(["search"]));

    expect(metadata).toMatchObject({
      title: "Search the site | Proti Health",
      description: "Find pages, articles, and other content.",
      alternates: {
        canonical: "https://example.com/search",
        languages: {
          "en-US": "https://example.com/search",
          "es-US": "https://example.com/es-us/search",
          "x-default": "https://example.com/search",
        },
      },
    });

    expect(mocks.resolveDocumentTranslations).toHaveBeenCalledWith({
      siteId: "site-proti",
      documentId: "page-search",
      documentType: "page",
      defaultLocale: "en-us",
      domains: ["www.example.com", "example.com"],
      canonicalDomain: "example.com",
    });
  });
});

describe("rendered JSON-LD output", () => {
  it("renders one Schema.org graph for a normal Page with Organization, WebSite, WebPage, and BreadcrumbList", async () => {
    mocks.resolveRoute.mockResolvedValue({
      type: "page",
      page: {
        _id: "page-widget",
        title: "Widget",
        locale: "en-us",
        seo: {
          metaDescription: "Widget description.",
        },
        sections: [],
      },
    });

    const element = await Page(pageProps(["products", "widget"]));
    const html = renderToStaticMarkup(element);
    const graph = getJsonLdGraph(html);

    expect(graph.map((item) => item["@type"])).toEqual([
      "Organization",
      "WebSite",
      "WebPage",
      "BreadcrumbList",
    ]);

    expect(getGraphNode(graph, "WebPage")).toMatchObject({
      "@id": "https://example.com/products/widget#webpage",
      url: "https://example.com/products/widget",
      name: "Widget",
      description: "Widget description.",
      inLanguage: "en-US",
      isPartOf: {
        "@id": "https://example.com/#website",
      },
      publisher: {
        "@id": "https://example.com/#organization",
      },
      breadcrumb: {
        "@id": "https://example.com/products/widget#breadcrumb",
      },
    });
  });

  it("renders Author routes as ProfilePage + Person and connects the entities by stable @id", async () => {
    mocks.resolveRoute.mockResolvedValue({
      type: "author",
      authorPage: {
        locale: "en-us",
        author,
        articles: [
          {
            _id: "blog-author-nutrition",
            title: "Nutrition Basics",
            slug: "nutrition-basics",
            publishedAt: "2026-09-01T12:00:00Z",
          },
        ],
      },
    });

    const element = await Page(pageProps(["authors", "jane-smith"]));
    const html = renderToStaticMarkup(element);
    const graph = getJsonLdGraph(html);

    const profilePage = getGraphNode(graph, "ProfilePage");
    const person = getGraphNode(graph, "Person");

    expect(profilePage).toMatchObject({
      "@id": "https://example.com/authors/jane-smith#webpage",
      url: "https://example.com/authors/jane-smith",
      name: "Jane Smith",
      dateCreated: "2026-01-15T12:00:00.000Z",
      dateModified: "2026-09-30T16:00:00.000Z",
      mainEntity: {
        "@id": "https://example.com/#person-jane-smith",
      },
      hasPart: [
        {
          "@type": "BlogPosting",
          "@id": "https://example.com/blog/nutrition-basics#blogposting",
          url: "https://example.com/blog/nutrition-basics",
          headline: "Nutrition Basics",
          datePublished: "2026-09-01T12:00:00.000Z",
          author: {
            "@id": "https://example.com/#person-jane-smith",
          },
        },
      ],
    });

    expect(person).toMatchObject({
      "@id": "https://example.com/#person-jane-smith",
      name: "Jane Smith",
      jobTitle: "Registered Dietitian",
      mainEntityOfPage: {
        "@id": "https://example.com/authors/jane-smith#webpage",
      },
    });
  });

  it("renders BlogPosting, Author, Reviewer, WebPage, and citation relationships in one graph", async () => {
    mocks.resolveRoute.mockResolvedValue({
      type: "blog",
      blog,
    });

    mocks.resolveDocumentTranslations.mockResolvedValue({
      localeHrefs: {
        "en-us": "/blog/nutrition-basics",
      },
      languageAlternates: {
        "en-US": "https://example.com/blog/nutrition-basics",
        "x-default": "https://example.com/blog/nutrition-basics",
      },
    });

    const element = await Page(pageProps(["blog", "nutrition-basics"]));
    const html = renderToStaticMarkup(element);
    const graph = getJsonLdGraph(html);

    expect(graph.filter((item) => item["@type"] === "Person")).toHaveLength(2);

    const webPage = getGraphNode(graph, "WebPage");
    const posting = getGraphNode(graph, "BlogPosting");

    expect(webPage).toMatchObject({
      "@id": "https://example.com/blog/nutrition-basics#webpage",
      mainEntity: {
        "@id": "https://example.com/blog/nutrition-basics#blogposting",
      },
      reviewedBy: {
        "@type": "Person",
        "@id": "https://example.com/#person-alex-reviewer",
        name: "Alex Reviewer",
        url: "https://example.com/authors/alex-reviewer",
      },
      lastReviewed: "2026-09-22",
      primaryImageOfPage: {
        "@id": "https://example.com/blog/nutrition-basics#primaryimage",
      },
    });

    expect(posting).toMatchObject({
      "@id": "https://example.com/blog/nutrition-basics#blogposting",
      headline: "Nutrition Basics",
      datePublished: "2026-09-01T12:00:00Z",
      dateModified: "2026-09-21T15:30:00Z",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://example.com/blog/nutrition-basics#webpage",
      },
      author: {
        "@type": "Person",
        "@id": "https://example.com/#person-jane-smith",
        name: "Jane Smith",
        url: "https://example.com/authors/jane-smith",
      },
      keywords: ["Nutrition", "Metabolic Health"],
      citation: [
        {
          "@type": "CreativeWork",
          name: "Nutrition Guidelines",
          url: "https://example.org/guidelines",
        },
      ],
    });
  });

  it("uses the default Author and Reviewer ProfilePage URLs in translated Blog JSON-LD when those people are not translated", async () => {
    mocks.resolveRoute.mockResolvedValue({
      type: "blog",
      blog: {
        ...blog,
        locale: "es-us",
        title: "Conceptos básicos de nutrición",
        author: {
          ...author,
          availableLocales: ["en-us"],
        },
        reviewer: {
          ...reviewer,
          availableLocales: ["en-us"],
        },
      },
    });

    mocks.resolveDocumentTranslations.mockResolvedValue({
      localeHrefs: {
        "en-us": "/blog/nutrition-basics",
        "es-us": "/es-us/blog/nutrition-basics",
      },
      languageAlternates: {
        "en-US": "https://example.com/blog/nutrition-basics",
        "es-US": "https://example.com/es-us/blog/nutrition-basics",
        "x-default": "https://example.com/blog/nutrition-basics",
      },
    });

    const element = await Page(
      pageProps(["es-us", "blog", "nutrition-basics"]),
    );
    const html = renderToStaticMarkup(element);
    const graph = getJsonLdGraph(html);

    const people = graph.filter((item) => item["@type"] === "Person");
    const posting = getGraphNode(graph, "BlogPosting");
    const webPage = getGraphNode(graph, "WebPage");

    expect(people).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@id": "https://example.com/#person-jane-smith",
          url: "https://example.com/authors/jane-smith",
        }),
        expect.objectContaining({
          "@id": "https://example.com/#person-alex-reviewer",
          url: "https://example.com/authors/alex-reviewer",
        }),
      ]),
    );

    expect(posting).toMatchObject({
      author: {
        "@id": "https://example.com/#person-jane-smith",
        url: "https://example.com/authors/jane-smith",
      },
    });

    expect(webPage).toMatchObject({
      reviewedBy: {
        "@id": "https://example.com/#person-alex-reviewer",
        url: "https://example.com/authors/alex-reviewer",
      },
    });
  });

  it("does not emit JSON-LD from draft content while Visual Editing is active", async () => {
    mocks.draftMode.mockResolvedValue({ isEnabled: true });

    mocks.resolveRoute.mockResolvedValue({
      type: "page",
      page: {
        _id: "drafts.page-widget",
        title: "Unpublished Widget Title",
        locale: "en-us",
        sections: [],
      },
    });

    const element = await Page(pageProps(["products", "widget"]));
    const html = renderToStaticMarkup(element);

    expect(html).not.toContain('type="application/ld+json"');
  });
});
