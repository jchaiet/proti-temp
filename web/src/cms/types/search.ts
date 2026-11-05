export type SearchContentType =
  | "page"
  | "article"
  | "blog"
  | "news"
  | "resource";

export type SearchCustomSortField =
  | "date"
  | "title"
  | "content-type"
  | "file-type";

export type SearchSortDirection = "asc" | "desc";

export type SearchStandardSort =
  | "relevance"
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc";

export type SearchCustomSort =
  `custom:${SearchCustomSortField}:${SearchSortDirection}`;

export type SearchSort = SearchStandardSort | SearchCustomSort;

export type SearchTaxonomyMatch = "any" | "all";

export interface SearchTaxonomyFilterGroup {
  taxonomy: string[];
  taxonomyMatch: SearchTaxonomyMatch;
}

export interface SearchTaxonomyItem {
  id: string;
  title: string;
  path: string;
}

export interface SearchAuthor {
  id: string;
  name: string;
  jobTitle?: string;
}

export interface SearchResult {
  id: string;
  type: SearchContentType;

  title: string;
  description?: string;

  href: string;

  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;

  date?: string;

  fileType?: string;
  fileSize?: string;

  author?: SearchAuthor;
  taxonomy?: SearchTaxonomyItem[];
}

export interface SearchFacetOption<TValue extends string = string> {
  value: TValue;
  label: string;
  count: number;
}

export interface SearchFacets {
  types: SearchFacetOption<SearchContentType>[];
  taxonomy: SearchFacetOption[];
}

export interface SearchResponse {
  query: string;
  locale: string;

  page: number;
  pageSize: number;

  total: number;
  totalPages: number;

  sort: SearchSort;

  filters: {
    types: SearchContentType[];
    taxonomy: string[];
    taxonomyMatch: SearchTaxonomyMatch;
  };

  facets: SearchFacets;

  results: SearchResult[];
}

export interface SearchContentOptions {
  siteId: string;
  locale: string;

  query: string;

  /**
   * Dynamic Document Lists can show their scoped content before a visitor
   * enters a search term. Leave this false/undefined when results should
   * require a non-empty query.
   */
  includeAllOnEmptyQuery?: boolean;

  /**
   * Search resolution respects SEO visibility by default. Editorial Document
   * Lists can disable this so noindex/canonical settings do not remove
   * otherwise eligible content from an on-page listing.
   */
  respectSeoVisibility?: boolean;

  page?: number;
  pageSize?: number;

  types?: SearchContentType[];

  /**
   * Visitor-selected Taxonomy filters.
   */
  taxonomy?: string[];
  taxonomyMatch?: SearchTaxonomyMatch;

  /**
   * Optional independent visitor Taxonomy groups. Each group applies its own
   * any/all matching and every active group must match.
   *
   * The legacy taxonomy/taxonomyMatch pair above remains supported for
   * callers that expose one Taxonomy filter group.
   */
  taxonomyGroups?: SearchTaxonomyFilterGroup[];

  /**
   * Optional authored Taxonomy scope applied before visitor filters.
   */
  taxonomyScope?: string[];
  taxonomyScopeMatch?: SearchTaxonomyMatch;

  sort?: SearchSort;

  /**
   * Optional visitor filter values supplied by a server-backed Document List.
   * Values are matched against content type, taxonomy, and resource metadata.
   */
  filters?: string[];

  /**
   * Optional upper bound used by Dynamic Document List blocks.
   * Omit this when the caller does not need a capped result set.
   */
  maxResults?: number;
}
