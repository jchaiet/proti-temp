import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  resolveSanityImagePreset: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.fetch,
  },
}));

vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImagePreset: mocks.resolveSanityImagePreset,
}));

import {
  buildBlogPostingSchema,
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildOrganizationSchema,
  buildPersonSchema,
  buildProfilePageSchema,
  buildWebPageSchema,
  buildWebSiteSchema,
  getPersonSchemaId,
  resolveStructuredDataSite,
  resolveStructuredDataUrl,
} from "./structured-data";

const site = {
  name: "Proti",
  origin: "https://example.com",
  locales: ["en-us", "es-us"],
  organization: {
    name: "Proti Inc.",
    legalName: "Proti Incorporated",
    description: "A content platform.",
    logoUrl: "https://cdn.example.com/logo.png",
    logoAlt: "Proti logo",
    sameAs: ["https://linkedin.com/company/proti"],
    contactPoints: [
      {
        contactType: "customer support",
        email: "support@example.com",
        availableLanguages: ["English", "Spanish"],
      },
    ],
    address: {
      streetAddress: "1 Main Street",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10001",
      addressCountry: "us",
    },
  },
};

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.resolveSanityImagePreset.mockReset();
  mocks.resolveSanityImagePreset.mockReturnValue(
    "https://cdn.example.com/logo-preset.png",
  );
});

it("resolves Site origin and organization logo through the logo image preset", async () => {
  const logo = {
    asset: {
      _type: "reference",
      _ref: "image-logo",
    },
    alt: "Proti logo",
  };

  mocks.fetch.mockResolvedValue({
    name: "Proti",
    domains: ["www.example.com", "example.com"],
    canonicalDomain: "example.com",
    locales: [{ code: "en-us" }, { code: "es-us" }],
    organization: {
      name: "Proti Inc.",
      logo,
    },
  });

  const result = await resolveStructuredDataSite("site-proti");

  expect(mocks.fetch).toHaveBeenCalledWith(
    expect.stringContaining('_type == "site"'),
    {
      siteId: "site-proti",
    },
    {
      next: {
        revalidate: false,
      },
    },
  );

  expect(mocks.resolveSanityImagePreset).toHaveBeenCalledWith(logo, "logo");

  expect(result).toEqual({
    name: "Proti",
    origin: "https://example.com",
    locales: ["en-us", "es-us"],
    organization: {
      name: "Proti Inc.",
      logo,
      logoUrl: "https://cdn.example.com/logo-preset.png",
      logoAlt: "Proti logo",
    },
  });
});

it("returns null for a missing Site ID, missing Site, or Site without a domain", async () => {
  await expect(resolveStructuredDataSite("")).resolves.toBeNull();
  expect(mocks.fetch).not.toHaveBeenCalled();

  mocks.fetch.mockResolvedValueOnce(null);
  await expect(resolveStructuredDataSite("missing")).resolves.toBeNull();

  mocks.fetch.mockResolvedValueOnce({
    name: "No Domain",
    domains: [],
  });
  await expect(resolveStructuredDataSite("site-no-domain")).resolves.toBeNull();
});

it("resolves canonical structured-data URLs and falls back to the public URL", () => {
  expect(
    resolveStructuredDataUrl({
      site,
      publicPath: "/products/widget",
    }),
  ).toBe("https://example.com/products/widget");

  expect(
    resolveStructuredDataUrl({
      site,
      publicPath: "/products/widget",
      canonicalUrl: "https://canonical.example.com/widget",
    }),
  ).toBe("https://canonical.example.com/widget");

  expect(
    resolveStructuredDataUrl({
      site,
      publicPath: "/products/widget",
      canonicalUrl: "http://[",
    }),
  ).toBe("https://example.com/products/widget");
});

it("uses the generated Author page as Person.url and moves an external profile into sameAs", () => {
  const author = {
    _id: "author-jane",
    name: "Jane Smith",
    slug: "jane-smith",
    bio: "Nutrition expert.",
    jobTitle: "Registered Dietitian",
    expertise: ["Nutrition", "Metabolic health", "Nutrition"],
    credentials: [
      {
        name: "Registered Dietitian Nutritionist",
        category: "Registration",
        identifier: "RDN-123",
        recognizedBy: "Commission on Dietetic Registration",
        url: "https://example.org/credentials/rdn-123",
      },
    ],
    affiliation: {
      name: "Proti Health",
      url: "https://example.com",
    },
    profileUrl: "https://jane.example.com",
    sameAs: ["https://linkedin.com/in/jane"],
    imageUrl: "https://cdn.example.com/jane.jpg",
    imageAlt: "Jane Smith",
  };

  const schema = buildPersonSchema({
    site,
    author,
    url: "https://example.com/authors/jane-smith",
  });

  expect(schema).toMatchObject({
    "@type": "Person",
    "@id": "https://example.com/#person-jane-smith",
    name: "Jane Smith",
    description: "Nutrition expert.",
    jobTitle: "Registered Dietitian",
    knowsAbout: ["Nutrition", "Metabolic health"],
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        name: "Registered Dietitian Nutritionist",
        credentialCategory: "Registration",
        identifier: "RDN-123",
        url: "https://example.org/credentials/rdn-123",
        recognizedBy: {
          "@type": "Organization",
          name: "Commission on Dietetic Registration",
        },
      },
    ],
    affiliation: {
      "@type": "Organization",
      name: "Proti Health",
      url: "https://example.com",
    },
    url: "https://example.com/authors/jane-smith",
    image: {
      "@type": "ImageObject",
      "@id": "https://example.com/#person-jane-smith-image",
      url: "https://cdn.example.com/jane.jpg",
      contentUrl: "https://cdn.example.com/jane.jpg",
      caption: "Jane Smith",
    },
    sameAs: ["https://linkedin.com/in/jane", "https://jane.example.com"],
    mainEntityOfPage: {
      "@id": "https://example.com/authors/jane-smith#webpage",
    },
  });

  expect(getPersonSchemaId(site, author)).toBe(
    "https://example.com/#person-jane-smith",
  );
});

it("builds a ProfilePage that points at the Author Person entity", () => {
  const schema = buildProfilePageSchema({
    site,
    url: "https://example.com/authors/jane-smith",
    name: "Jane Smith",
    description: "Nutrition expert.",
    locale: "en-us",
    mainEntityId: "https://example.com/#person-jane-smith",
    breadcrumbId: "https://example.com/authors/jane-smith#breadcrumb",
    dateCreated: "2026-01-15T12:00:00Z",
    dateModified: "2026-09-30T16:00:00Z",
    hasPart: [
      {
        headline: "Nutrition Basics",
        url: "https://example.com/blog/nutrition-basics",
        publishedAt: "2026-09-01T12:00:00Z",
      },
    ],
  });

  expect(schema).toMatchObject({
    "@type": "ProfilePage",
    "@id": "https://example.com/authors/jane-smith#webpage",
    url: "https://example.com/authors/jane-smith",
    name: "Jane Smith",
    description: "Nutrition expert.",
    inLanguage: "en-US",
    dateCreated: "2026-01-15T12:00:00.000Z",
    dateModified: "2026-09-30T16:00:00.000Z",
    mainEntity: {
      "@id": "https://example.com/#person-jane-smith",
    },
    isPartOf: {
      "@id": "https://example.com/#website",
    },
    publisher: {
      "@id": "https://example.com/#organization",
    },
    breadcrumb: {
      "@id": "https://example.com/authors/jane-smith#breadcrumb",
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
});

it("builds Organization and WebSite entity relationships", () => {
  expect(buildOrganizationSchema(site)).toMatchObject({
    "@type": "Organization",
    "@id": "https://example.com/#organization",
    name: "Proti Inc.",
    legalName: "Proti Incorporated",
    url: "https://example.com",
    logo: {
      "@type": "ImageObject",
      "@id": "https://example.com/#organization-logo",
      url: "https://cdn.example.com/logo.png",
      contentUrl: "https://cdn.example.com/logo.png",
      caption: "Proti logo",
    },
    sameAs: ["https://linkedin.com/company/proti"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@example.com",
        availableLanguage: ["English", "Spanish"],
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "US",
    },
  });

  expect(buildWebSiteSchema(site)).toEqual({
    "@type": "WebSite",
    "@id": "https://example.com/#website",
    url: "https://example.com",
    name: "Proti",
    inLanguage: ["en-US", "es-US"],
    publisher: {
      "@id": "https://example.com/#organization",
    },
  });
});

it("normalizes locale in WebPage structured data", () => {
  expect(
    buildWebPageSchema({
      site,
      url: "https://example.com/es-us/products/widget",
      name: "Widget",
      description: "Descripción",
      locale: "es-us",
      reviewedBy: {
        _id: "author-reviewer",
        name: "Reviewer",
        slug: "reviewer",
      },
      reviewedByUrl: "https://example.com/authors/reviewer",
      lastReviewed: "2026-09-20T12:00:00Z",
    }),
  ).toMatchObject({
    "@type": "WebPage",
    "@id": "https://example.com/es-us/products/widget#webpage",
    inLanguage: "es-US",
    isPartOf: {
      "@id": "https://example.com/#website",
    },
    publisher: {
      "@id": "https://example.com/#organization",
    },
    reviewedBy: {
      "@type": "Person",
      "@id": "https://example.com/#person-reviewer",
      name: "Reviewer",
      url: "https://example.com/authors/reviewer",
    },
    lastReviewed: "2026-09-20",
  });

  expect(
    buildWebPageSchema({
      site,
      url: "https://example.com/es-us/products/widget",
      name: "Widget",
      locale: "es-us",
    }),
  ).not.toHaveProperty("about");
});

it("builds BlogPosting with Person reference, localized keywords, and modified-date fallback", () => {
  const author = {
    _id: "author-jane",
    name: "Jane Smith",
    slug: "jane-smith",
  };

  const schema = buildBlogPostingSchema({
    site,
    url: "https://example.com/blog/nutrition",
    headline: "Nutrition",
    locale: "en-us",
    imageUrl: "https://cdn.example.com/nutrition.jpg",
    publishedAt: "2026-09-01T12:00:00Z",
    author,
    authorUrl: "https://example.com/authors/jane-smith",
    citations: [
      {
        title: "Nutrition Guidelines",
        publisher: "Example Health Organization",
        publicationDate: "2026-08-01",
        url: "https://example.org/guidelines",
      },
    ],
    keywords: ["Nutrition", " Health ", "", "Nutrition"],
    topics: ["Nutrition", " Health ", "", "Nutrition"],
  });

  expect(schema).toMatchObject({
    "@type": "BlogPosting",
    "@id": "https://example.com/blog/nutrition#blogposting",
    datePublished: "2026-09-01T12:00:00Z",
    dateModified: "2026-09-01T12:00:00Z",
    image: {
      "@type": "ImageObject",
      "@id": "https://example.com/blog/nutrition#primaryimage",
      url: "https://cdn.example.com/nutrition.jpg",
      contentUrl: "https://cdn.example.com/nutrition.jpg",
    },
    keywords: ["Nutrition", "Health"],
    articleSection: ["Nutrition", "Health"],
    about: [
      {
        "@type": "Thing",
        name: "Nutrition",
      },
      {
        "@type": "Thing",
        name: "Health",
      },
    ],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://example.com/blog/nutrition#webpage",
    },
    author: {
      "@type": "Person",
      "@id": "https://example.com/#person-jane-smith",
      name: "Jane Smith",
      url: "https://example.com/authors/jane-smith",
    },
    citation: [
      {
        "@type": "CreativeWork",
        name: "Nutrition Guidelines",
        url: "https://example.org/guidelines",
        datePublished: "2026-08-01",
        publisher: {
          "@type": "Organization",
          name: "Example Health Organization",
        },
      },
    ],
    publisher: {
      "@id": "https://example.com/#organization",
    },
  });
});

it("uses an explicit editorial modified date when provided", () => {
  const schema = buildBlogPostingSchema({
    site,
    url: "https://example.com/blog/updated",
    headline: "Updated article",
    locale: "en-us",
    publishedAt: "2026-09-01T12:00:00Z",
    modifiedAt: "2026-09-21T15:30:00Z",
  });

  expect(schema).toMatchObject({
    datePublished: "2026-09-01T12:00:00Z",
    dateModified: "2026-09-21T15:30:00Z",
  });
});

it("builds Taxonomy CollectionPage ItemList entries in supplied order", () => {
  const schema = buildCollectionPageSchema({
    site,
    url: "https://example.com/blog/topics/nutrition",
    name: "Nutrition",
    locale: "en-us",
    items: [
      {
        name: "First article",
        url: "https://example.com/blog/first",
      },
      {
        name: "Second article",
        url: "https://example.com/blog/second",
      },
      {
        name: "",
        url: "https://example.com/blog/invalid",
      },
    ],
  });

  expect(schema).toMatchObject({
    "@type": "CollectionPage",
    publisher: {
      "@id": "https://example.com/#organization",
    },
    about: {
      "@type": "Thing",
      name: "Nutrition",
    },
    mainEntity: {
      "@type": "ItemList",
      "@id": "https://example.com/blog/topics/nutrition#itemlist",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "First article",
          url: "https://example.com/blog/first",
          item: {
            "@type": "BlogPosting",
            "@id": "https://example.com/blog/first#blogposting",
            url: "https://example.com/blog/first",
            headline: "First article",
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Second article",
          url: "https://example.com/blog/second",
          item: {
            "@type": "BlogPosting",
            "@id": "https://example.com/blog/second#blogposting",
            url: "https://example.com/blog/second",
            headline: "Second article",
          },
        },
      ],
    },
  });
});

it("connects WebPage to its primary entity and breadcrumb by stable @id", () => {
  expect(
    buildWebPageSchema({
      site,
      url: "https://example.com/blog/nutrition",
      name: "Nutrition",
      locale: "en-us",
      mainEntityId: "https://example.com/blog/nutrition#blogposting",
      breadcrumbId: "https://example.com/blog/nutrition#breadcrumb",
      primaryImageId: "https://example.com/blog/nutrition#primaryimage",
    }),
  ).toMatchObject({
    "@id": "https://example.com/blog/nutrition#webpage",
    mainEntity: {
      "@id": "https://example.com/blog/nutrition#blogposting",
    },
    breadcrumb: {
      "@id": "https://example.com/blog/nutrition#breadcrumb",
    },
    primaryImageOfPage: {
      "@id": "https://example.com/blog/nutrition#primaryimage",
    },
  });
});

it("returns no BreadcrumbList for a Homepage-only trail and builds one for deeper routes", () => {
  expect(
    buildBreadcrumbSchema([
      {
        name: "Home",
        url: "https://example.com/",
      },
    ]),
  ).toBeNull();

  expect(
    buildBreadcrumbSchema([
      {
        name: "Home",
        url: "https://example.com/",
      },
      {
        name: "Blog",
        url: "https://example.com/blog",
      },
      {
        name: "Nutrition",
        url: "https://example.com/blog/nutrition",
      },
    ]),
  ).toEqual({
    "@type": "BreadcrumbList",
    "@id": "https://example.com/blog/nutrition#breadcrumb",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://example.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://example.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Nutrition",
        item: "https://example.com/blog/nutrition",
      },
    ],
  });
});
