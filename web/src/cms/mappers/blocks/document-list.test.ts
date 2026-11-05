import { beforeEach, expect, it, vi } from "vitest";

import type { CmsDocumentListBlock } from "@/cms/types";

const mocks = vi.hoisted(() => ({
  mapArticleCard: vi.fn(),
  mapResourceCard: vi.fn(),
  mapTestimonialCard: vi.fn(),
  mapSectionHeading: vi.fn(),
  resolveDynamicDocumentList: vi.fn(),
  searchContent: vi.fn(),
  siteLocaleToLanguageTag: vi.fn(),
}));

vi.mock("@/cms/mappers/cards", () => ({
  mapArticleCard: mocks.mapArticleCard,
  mapResourceCard: mocks.mapResourceCard,
  mapTestimonialCard: mocks.mapTestimonialCard,
}));

vi.mock("@/cms/mappers/section-heading", () => ({
  mapSectionHeading: mocks.mapSectionHeading,
}));

vi.mock("@/cms/resolvers/document-list", () => ({
  resolveDynamicDocumentList: mocks.resolveDynamicDocumentList,
}));

vi.mock("@/cms/resolvers/search", () => ({
  searchContent: mocks.searchContent,
}));

vi.mock("@/lib/routing/locale", () => ({
  siteLocaleToLanguageTag: mocks.siteLocaleToLanguageTag,
}));

import { mapDocumentListBlock } from "./document-list";

function asBlock(value: Record<string, unknown>): CmsDocumentListBlock {
  return value as unknown as CmsDocumentListBlock;
}

beforeEach(() => {
  mocks.mapArticleCard.mockReset();
  mocks.mapResourceCard.mockReset();
  mocks.mapTestimonialCard.mockReset();
  mocks.mapSectionHeading.mockReset();
  mocks.resolveDynamicDocumentList.mockReset();
  mocks.searchContent.mockReset();
  mocks.siteLocaleToLanguageTag.mockReset();

  mocks.mapSectionHeading.mockReturnValue({
    eyebrow: "Resources",
    title: "Latest",
  });

  mocks.siteLocaleToLanguageTag.mockImplementation((locale: string) => {
    if (locale === "es-us") {
      return "es-US";
    }

    return "en-US";
  });
});

it("maps a manual ArticleCard without formatting away the raw ISO date", async () => {
  mocks.mapArticleCard.mockResolvedValue({
    title: "Nutrition Basics",
    summary: "A practical guide.",
    href: "/blog/nutrition-basics",
    publishedAt: "2026-08-31T14:17:00.000Z",
    category: "Nutrition",
    imageUrl: "article.jpg",
    author: {
      name: "Jane Smith",
      role: "Registered Dietitian",
      avatarUrl: "jane.jpg",
    },
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [
        {
          _key: "article-1",
          _type: "articleCard",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
    },
  );

  expect(mapped.props.documents).toEqual([
    {
      id: "article-1",
      contentType: "article",
      cardType: "article",
      title: "Nutrition Basics",
      summary: "A practical guide.",
      url: "/blog/nutrition-basics",
      date: "2026-08-31T14:17:00.000Z",
      tags: ["Nutrition"],
      thumbnail: "article.jpg",
      author: {
        name: "Jane Smith",
        role: "Registered Dietitian",
        avatarUrl: "jane.jpg",
      },
    },
  ]);

  expect(mapped.props.dateLocale).toBe("en-US");
  expect(mapped.props.labels?.clearFilters).toBe("Clear Filters");
  expect(mapped.props.labels?.next).toBe("Next");
});

it("maps manual Resource and Testimonial cards into DocumentItem shapes", async () => {
  mocks.mapResourceCard.mockResolvedValue({
    title: "Nutrition PDF",
    summary: "Downloadable guide",
    href: "/resources/nutrition.pdf",
    imageUrl: "resource.jpg",
    tags: ["Nutrition", "PDF"],
    fileType: "PDF",
    fileSize: "2 MB",
  });

  mocks.mapTestimonialCard.mockResolvedValue({
    quote: "This guide helped our team.",
    rating: 5,
    companyLogoUrl: "company.svg",
    author: {
      name: "Alex Doe",
      title: "Director",
      company: "Example Co",
      avatarUrl: "alex.jpg",
    },
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [
        {
          _key: "resource-1",
          _type: "resourceCard",
        },
        {
          _key: "testimonial-1",
          _type: "testimonialCard",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
    },
  );

  expect(mapped.props.documents[0]).toMatchObject({
    id: "resource-1",
    contentType: "resource",
    cardType: "resource",
    title: "Nutrition PDF",
    url: "/resources/nutrition.pdf",
    tags: ["Nutrition", "PDF"],
    fileType: "PDF",
    fileSize: "2 MB",
    metaLabel: "2 MB",
  });

  expect(mapped.props.documents[1]).toMatchObject({
    id: "testimonial-1",
    cardType: "testimonial",
    summary: "This guide helped our team.",
    rating: 5,
    companyLogoUrl: "company.svg",
    author: {
      name: "Alex Doe",
      title: "Director",
      company: "Example Co",
      avatarUrl: "alex.jpg",
    },
  });
});

it("drops manual card entries whose card mapper returns null", async () => {
  mocks.mapArticleCard.mockResolvedValue(null);

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [
        {
          _key: "article-1",
          _type: "articleCard",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
    },
  );

  expect(mapped.props.documents).toEqual([]);
});

it("keeps an unsearched non-Page Dynamic list on the lightweight resolver", async () => {
  mocks.resolveDynamicDocumentList.mockResolvedValue([
    {
      id: "blog-1",
      contentType: "blog",
      cardType: "article",
      title: "Nutrition",
      url: "/es-us/blog/nutrition",
    },
  ]);

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["blog", "article"],
      dynamicTaxonomy: [
        {
          _type: "reference",
          _ref: "drafts.taxonomy-nutrition",
        },
        {
          _id: "taxonomy-health",
          title: "Health",
        },
      ],
      dynamicTaxonomyMatchLogic: "all",
      dynamicSort: "oldest",
      dynamicLimit: 24,
    }),
    {
      siteId: "site-proti",
      locale: "es-us",
      localePrefix: "/es-us",
    },
  );

  expect(mocks.resolveDynamicDocumentList).toHaveBeenCalledWith({
    siteId: "site-proti",
    locale: "es-us",
    localePrefix: "/es-us",
    contentTypes: ["blog", "article"],
    taxonomyIds: ["taxonomy-nutrition", "taxonomy-health"],
    taxonomyMatchLogic: "all",
    sort: "oldest",
    limit: 24,
    visualEditing: undefined,
  });

  expect(mocks.searchContent).not.toHaveBeenCalled();
  expect(mapped.props.documents).toEqual([
    expect.objectContaining({
      id: "blog-1",
      contentType: "blog",
      cardType: "article",
      title: "Nutrition",
      url: "/es-us/blog/nutrition",
    }),
  ]);
  expect(mapped.serverState).toEqual({
    searchQuery: "",
    selectedFilter: "all",
    selectedTaxonomy: [],
    selectedTaxonomyGroups: {},
    selectedSort: "oldest",
    currentPage: 1,
    totalPages: 1,
    totalResults: 1,
  });
  expect(mapped.props.dateLocale).toBe("es-US");
  expect(mapped.props.labels?.clearFilters).toBe("Limpiar filtros");
  expect(mapped.props.labels?.next).toBe("Siguiente");
});

it("uses the full resolver for an unsearched Dynamic list that includes Pages", async () => {
  mocks.searchContent.mockResolvedValue({
    query: "",
    locale: "en-us",
    page: 1,
    pageSize: 9,
    total: 1,
    totalPages: 1,
    sort: "newest",
    filters: {
      types: ["page", "blog"],
      taxonomy: [],
      taxonomyMatch: "any",
    },
    facets: {
      types: [],
      taxonomy: [],
    },
    results: [
      {
        id: "page-child",
        type: "page",
        title: "Widget",
        href: "/products/widget",
      },
    ],
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["page", "blog"],
      dynamicLimit: 30,
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
    },
  );

  expect(mocks.searchContent).toHaveBeenCalledWith(
    expect.objectContaining({
      siteId: "site-proti",
      locale: "en-us",
      query: "",
      includeAllOnEmptyQuery: true,
      types: ["page", "blog"],
      respectSeoVisibility: false,
      maxResults: 30,
    }),
  );
  expect(mocks.resolveDynamicDocumentList).not.toHaveBeenCalled();
  expect(mapped.props.documents[0]).toMatchObject({
    id: "page-child",
    contentType: "page",
    url: "/products/widget",
  });
});

it("uses the URL query to search all selected Dynamic content types, including Pages", async () => {
  mocks.searchContent.mockResolvedValue({
    query: "nutrition",
    locale: "en-us",
    page: 2,
    pageSize: 12,
    total: 18,
    totalPages: 2,
    sort: "relevance",
    filters: {
      types: ["page", "blog"],
      taxonomy: [],
      taxonomyMatch: "any",
    },
    facets: {
      types: [],
      taxonomy: [],
    },
    results: [
      {
        id: "page-1",
        type: "page",
        title: "Nutrition",
        href: "/nutrition",
      },
    ],
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["page", "blog"],
      enableSearch: true,
      enablePagination: true,
      itemsPerPage: 12,
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
      searchParams: {
        q: "nutrition",
        page: "2",
      },
    },
  );

  expect(mocks.searchContent).toHaveBeenCalledWith(
    expect.objectContaining({
      siteId: "site-proti",
      locale: "en-us",
      query: "nutrition",
      page: 2,
      pageSize: 12,
      types: ["page", "blog"],
      sort: "relevance",
      maxResults: undefined,
    }),
  );

  expect(mapped.props.documents[0]).toMatchObject({
    id: "page-1",
    contentType: "page",
    cardType: "article",
    url: "/nutrition",
  });
});

it("excludes Taxonomy Groups and non-filterable Terms from visitor filter options", async () => {
  mocks.searchContent.mockResolvedValueOnce({
    query: "",
    locale: "en-us",
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
    sort: "relevance",
    filters: {
      types: ["page"],
      taxonomy: [],
      taxonomyMatch: "any",
    },
    facets: {
      types: [],
      taxonomy: [],
    },
    results: [],
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["page"],
      enableFilters: true,
      filterTaxonomy: [
        {
          _id: "taxonomy-group",
          title: "Categories",
          kind: "group",
        },
        {
          _id: "taxonomy-hidden",
          title: "Internal Topic",
          kind: "term",
          includeInFilters: false,
        },
        {
          _id: "taxonomy-visible",
          title: "Mental Health",
          kind: "term",
          includeInFilters: true,
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
    },
  );

  expect(mapped.props.filterGroups).toEqual([
    {
      id: "taxonomy",
      title: "Topics",
      options: [
        {
          label: "Mental Health",
          value: "taxonomy-visible",
        },
      ],
      logic: "checkbox",
    },
  ]);
});

it("maps localized Taxonomy references into a separate visitor filter group", async () => {
  mocks.searchContent.mockResolvedValueOnce({
    query: "nutrition",
    locale: "es-us",
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
    sort: "relevance",
    filters: {
      types: ["page", "blog"],
      taxonomy: ["taxonomy-nutrition"],
      taxonomyMatch: "any",
    },
    facets: {
      types: [],
      taxonomy: [],
    },
    results: [],
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["page", "blog"],
      enableSearch: true,
      enableFilters: true,
      filterTitle: "Tipo de contenido",
      filterLogic: "radio",
      filterOptions: [
        {
          label: "Páginas",
          value: "page",
        },
        {
          label: "Blog",
          value: "blog",
        },
      ],
      taxonomyFilterTitle: "Temas",
      taxonomyFilterLogic: "checkbox",
      taxonomyFilterMatchLogic: "any",
      filterTaxonomy: [
        {
          _id: "taxonomy-nutrition",
          title: "Nutrición",
        },
        {
          _ref: "taxonomy-fitness",
          title: "Ejercicio",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "es-us",
      searchParams: {
        q: "nutrition",
        filter: "blog",
        taxonomy: "taxonomy-nutrition",
      },
    },
  );

  expect(mapped.props.filterGroups).toEqual([
    {
      id: "content",
      title: "Tipo de contenido",
      options: [
        {
          label: "Páginas",
          value: "page",
        },
        {
          label: "Blog",
          value: "blog",
        },
      ],
      logic: "radio",
    },
    {
      id: "taxonomy",
      title: "Temas",
      options: [
        {
          label: "Nutrición",
          value: "taxonomy-nutrition",
        },
        {
          label: "Ejercicio",
          value: "taxonomy-fitness",
        },
      ],
      logic: "checkbox",
    },
  ]);

  expect(mocks.searchContent).toHaveBeenCalledWith(
    expect.objectContaining({
      filters: ["blog"],
      taxonomy: ["taxonomy-nutrition"],
      taxonomyMatch: "any",
      taxonomyScope: [],
      taxonomyScopeMatch: "any",
    }),
  );

  expect(mapped.serverState).toEqual(
    expect.objectContaining({
      selectedFilter: "blog",
      selectedTaxonomy: ["taxonomy-nutrition"],
    }),
  );
});

it("maps enabled filter/sort options and ignores blank options", async () => {
  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [],
      enableFilters: true,
      filterOptions: [
        {
          label: "Nutrition",
          value: "nutrition",
        },
        {
          label: "",
          value: "invalid",
        },
      ],
      enableSorting: true,
      sortOptions: [
        {
          label: "Legacy newest label",
          value: "newest",
        },
        {
          label: "Broken",
          value: "",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
    },
  );

  expect(mapped.props.filterOptions).toEqual([
    {
      label: "Nutrition",
      value: "nutrition",
    },
  ]);

  expect(mapped.props.sortOptions).toEqual([
    {
      label: "Newest",
      value: "newest",
    },
  ]);
});

it("localizes standard sort labels from the current locale", async () => {
  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [],
      enableSorting: true,
      sortOptions: [
        {
          label: "Stored English label is ignored",
          value: "relevance",
        },
        {
          label: "Stored English label is ignored",
          value: "newest",
        },
        {
          label: "Stored English label is ignored",
          value: "oldest",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "es-us",
    },
  );

  expect(mapped.props.sortOptions).toEqual([
    {
      label: "Relevancia",
      value: "relevance",
    },
    {
      label: "Más recientes",
      value: "newest",
    },
    {
      label: "Más antiguos",
      value: "oldest",
    },
  ]);
});

it("can require a search query before loading a Dynamic Page list", async () => {
  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["page", "blog", "article"],
      enableSearch: true,
      requireSearchQuery: true,
      initialStateText: "Search the site to begin.",
      enableSorting: true,
      sortOptions: [
        {
          label: "Relevance",
          value: "Relevance",
        },
        {
          label: "Newest",
          value: "Newest",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
    },
  );

  expect(mocks.searchContent).not.toHaveBeenCalled();
  expect(mocks.resolveDynamicDocumentList).not.toHaveBeenCalled();
  expect(mapped.props.documents).toEqual([]);
  expect(mapped.props.emptyStateText).toBe("Search the site to begin.");
  expect(mapped.props.sortOptions).toEqual([
    {
      label: "Relevance",
      value: "relevance",
    },
    {
      label: "Newest",
      value: "newest",
    },
  ]);
  expect(mapped.serverState).toEqual({
    searchQuery: "",
    selectedFilter: "all",
    selectedTaxonomy: [],
    selectedTaxonomyGroups: {},
    selectedSort: "newest",
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
  });
});

it("allows an active filter to load results without a search term when input is required", async () => {
  mocks.searchContent.mockResolvedValue({
    query: "",
    locale: "en-us",
    page: 1,
    pageSize: 9,
    total: 1,
    totalPages: 1,
    sort: "newest",
    filters: {
      types: ["blog"],
      taxonomy: [],
      taxonomyMatch: "any",
    },
    facets: {
      types: [],
      taxonomy: [],
    },
    results: [
      {
        id: "blog-1",
        type: "blog",
        title: "Nutrition Basics",
        href: "/blog/nutrition-basics",
      },
    ],
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["blog"],
      enableSearch: true,
      requireSearchQuery: true,
      initialStateText: "Search or filter to begin.",
      enableFilters: true,
      filterLogic: "radio",
      filterOptions: [
        {
          label: "Blogs",
          value: "blog",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
      searchParams: {
        filter: "blog",
      },
    },
  );

  expect(mocks.searchContent).toHaveBeenCalledWith(
    expect.objectContaining({
      query: "",
      includeAllOnEmptyQuery: true,
      filters: ["blog"],
      maxResults: undefined,
    }),
  );

  expect(mapped.props.documents).toEqual([
    expect.objectContaining({
      id: "blog-1",
      title: "Nutrition Basics",
    }),
  ]);

  expect(mapped.serverState).toEqual(
    expect.objectContaining({
      searchQuery: "",
      selectedFilter: "blog",
      totalResults: 1,
    }),
  );
});

it("uses the normal empty state after an active filter returns no matches", async () => {
  mocks.searchContent.mockResolvedValue({
    query: "",
    locale: "en-us",
    page: 1,
    pageSize: 9,
    total: 0,
    totalPages: 0,
    sort: "newest",
    filters: {
      types: ["blog"],
      taxonomy: [],
      taxonomyMatch: "any",
    },
    facets: {
      types: [],
      taxonomy: [],
    },
    results: [],
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["blog"],
      enableSearch: true,
      requireSearchQuery: true,
      initialStateText: "Search or filter to begin.",
      emptyStateText: "Nothing matched.",
      enableFilters: true,
      filterLogic: "radio",
      filterOptions: [
        {
          label: "Blogs",
          value: "blog",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
      searchParams: {
        filter: "blog",
      },
    },
  );

  expect(mocks.searchContent).toHaveBeenCalled();
  expect(mapped.props.documents).toEqual([]);
  expect(mapped.props.emptyStateText).toBe("Nothing matched.");
});

it("normalizes configured filter and sort values before a server search", async () => {
  mocks.searchContent.mockResolvedValue({
    query: "nutrition",
    locale: "en-us",
    page: 1,
    pageSize: 9,
    total: 1,
    totalPages: 1,
    sort: "newest",
    filters: {
      types: ["page", "blog", "article"],
      taxonomy: [],
      taxonomyMatch: "any",
    },
    facets: {
      types: [],
      taxonomy: [],
    },
    results: [
      {
        id: "page-1",
        type: "page",
        title: "Nutrition",
        href: "/nutrition",
      },
    ],
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["page", "blog", "article"],
      enableSearch: true,
      requireSearchQuery: true,
      enableFilters: true,
      filterOptions: [
        {
          label: "Pages",
          value: "Page",
        },
      ],
      enableSorting: true,
      sortOptions: [
        {
          label: "Newest",
          value: "Newest",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
      searchParams: {
        q: "nutrition",
        filter: "Page",
        sort: "Newest",
      },
    },
  );

  expect(mocks.searchContent).toHaveBeenCalledWith(
    expect.objectContaining({
      query: "nutrition",
      types: ["page", "blog", "article"],
      filters: ["page"],
      sort: "newest",
    }),
  );
  expect(mapped.props.filterOptions).toEqual([
    {
      label: "Pages",
      value: "page",
    },
  ]);
  expect(mapped.props.sortOptions).toEqual([
    {
      label: "Newest",
      value: "newest",
    },
  ]);
});

it("preserves established defaults", async () => {
  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
    },
  );

  expect(mapped).toMatchObject({
    enableSearch: true,
    enableSorting: false,
    enablePagination: true,
    itemsPerPage: 9,
  });

  expect(mapped.props).toMatchObject({
    alignment: "left",
    gridCols: 3,
    filterTitle: "Categories",
    filterLogic: "radio",
    searchPlaceholder: "Search documents...",
    emptyStateText: "No documents found matching your criteria.",
  });
});

it("maps explicit Taxonomy filter groups and combines active groups with AND semantics", async () => {
  mocks.searchContent.mockResolvedValueOnce({
    query: "",
    locale: "en-us",
    page: 1,
    pageSize: 9,
    total: 0,
    totalPages: 0,
    sort: "newest",
    filters: {
      types: ["blog"],
      taxonomy: [],
      taxonomyMatch: "any",
    },
    facets: {
      types: [],
      taxonomy: [],
    },
    results: [],
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "dynamic",
      dynamicContentTypes: ["blog"],
      enableSearch: true,
      requireSearchQuery: true,
      initialStateText: "Search or filter to begin.",
      enableFilters: true,
      taxonomyFilterGroups: [
        {
          _key: "type",
          title: "Type",
          logic: "checkbox",
          matchLogic: "any",
          taxonomy: [
            { _id: "taxonomy-article", title: "Article" },
            { _id: "taxonomy-video", title: "Video" },
          ],
        },
        {
          _key: "treatment",
          title: "Treatment",
          logic: "checkbox",
          matchLogic: "all",
          taxonomy: [
            { _id: "taxonomy-asthma", title: "Asthma" },
            { _id: "taxonomy-diabetes", title: "Diabetes" },
          ],
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
      searchParams: {
        "taxonomy.type": ["taxonomy-article"],
        "taxonomy.treatment": ["taxonomy-asthma", "taxonomy-diabetes"],
      },
    },
  );

  expect(mapped.props.filterGroups).toEqual([
    {
      id: "taxonomy:type",
      title: "Type",
      logic: "checkbox",
      options: [
        { label: "Article", value: "taxonomy-article" },
        { label: "Video", value: "taxonomy-video" },
      ],
    },
    {
      id: "taxonomy:treatment",
      title: "Treatment",
      logic: "checkbox",
      options: [
        { label: "Asthma", value: "taxonomy-asthma" },
        { label: "Diabetes", value: "taxonomy-diabetes" },
      ],
    },
  ]);

  expect(mocks.searchContent).toHaveBeenCalledWith(
    expect.objectContaining({
      taxonomy: [],
      taxonomyGroups: [
        {
          taxonomy: ["taxonomy-article"],
          taxonomyMatch: "any",
        },
        {
          taxonomy: ["taxonomy-asthma", "taxonomy-diabetes"],
          taxonomyMatch: "all",
        },
      ],
    }),
  );

  expect(mapped.serverState).toEqual(
    expect.objectContaining({
      selectedTaxonomy: [],
      selectedTaxonomyGroups: {
        "taxonomy:type": ["taxonomy-article"],
        "taxonomy:treatment": ["taxonomy-asthma", "taxonomy-diabetes"],
      },
    }),
  );
});

it("maps standard sort presets before safe custom sort options", async () => {
  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "document-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [],
      enableSorting: true,
      standardSortOptions: ["relevance", "newest", "title-asc"],
      customSortOptions: [
        {
          _key: "file-desc",
          label: "File Type Z–A",
          field: "file-type",
          direction: "desc",
        },
      ],
    }),
    {
      siteId: "site-proti",
      locale: "en-us",
    },
  );

  expect(mapped.props.sortOptions).toEqual([
    { label: "Relevance", value: "relevance" },
    { label: "Newest", value: "newest" },
    { label: "Title A–Z", value: "title-asc" },
    { label: "File Type Z–A", value: "custom:file-type:desc" },
  ]);
});

it("forwards manual ArticleCard image dimensions into DocumentList", async () => {
  mocks.mapArticleCard.mockResolvedValue({
    title: "Portrait",
    imageUrl: "portrait.jpg",
    imageAlt: "Portrait of a person",
    imageWidth: 1300,
    imageHeight: 867,
  });

  const mapped = await mapDocumentListBlock(
    asBlock({
      _key: "dimension-list",
      _type: "documentListBlock",
      sourceMode: "manual",
      documents: [{ _key: "a", _type: "articleCard" }],
    }),
    { siteId: "site-proti", locale: "en-us" },
  );

  expect(mapped.props.documents[0]).toMatchObject({
    thumbnail: "portrait.jpg",
    thumbnailWidth: 1300,
    thumbnailHeight: 867,
    thumbnailAlt: "Portrait of a person",
  });
});
