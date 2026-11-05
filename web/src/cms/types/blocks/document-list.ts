import type {
  CmsArticleCard,
  CmsResourceCard,
  CmsTestimonialCard,
} from "../cards";

import type { CmsImage } from "../image";

import type { CmsSectionHeading } from "../section-heading";

export type CmsDocumentListCardType = "resource" | "article" | "testimonial";

export type CmsDocumentListAlignment = "left" | "center" | "right";

export type CmsDocumentListFilterLogic = "radio" | "checkbox";

export type CmsDocumentListSourceMode = "manual" | "dynamic";

export type CmsDocumentListDynamicContentType =
  | "page"
  | "article"
  | "blog"
  | "news"
  | "resource";

export type CmsDocumentListDynamicSort =
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc";

export type CmsDocumentListStandardSort =
  | "relevance"
  | CmsDocumentListDynamicSort;

export type CmsDocumentListCustomSortField =
  | "date"
  | "title"
  | "content-type"
  | "file-type";

export type CmsDocumentListSortDirection = "asc" | "desc";

export type CmsDocumentListTaxonomyMatchLogic = "any" | "all";

/**
 * A dynamic Taxonomy selection can arrive in either form:
 *
 * Raw Sanity reference:
 *   { _type: "reference", _ref: "taxonomy-id" }
 *
 * Dereferenced/projected Taxonomy object:
 *   { _id: "taxonomy-id", title: "...", slug: "..." }
 *
 * The mapper intentionally supports both so the CMS contract
 * stays compatible with either fragment shape.
 */
export interface CmsDocumentListTaxonomyReference {
  _type?: "reference" | "taxonomy";

  _ref?: string;

  _id?: string;

  title?: string;

  slug?: string;

  kind?: "term" | "group";

  includeInFilters?: boolean;
}

export interface CmsDocumentListTaxonomyTerm {
  _id: string;

  title: string;

  slug?: string;
}

export interface CmsDocumentListFilterOption {
  _key?: string;

  label: string;

  value: string;
}

export interface CmsDocumentListSortOption {
  _key?: string;

  label: string;

  value: string;
}

export interface CmsDocumentListCustomSortOption {
  _key?: string;

  label?: string;

  field?: CmsDocumentListCustomSortField;

  direction?: CmsDocumentListSortDirection;
}

export interface CmsDocumentListTaxonomyFilterGroup {
  _key?: string;

  title?: string;

  logic?: CmsDocumentListFilterLogic;

  matchLogic?: CmsDocumentListTaxonomyMatchLogic;

  taxonomy?: CmsDocumentListTaxonomyReference[];
}

export type CmsDocumentListResourceItem = CmsResourceCard & {
  _key: string;

  _type: "resourceCard";
};

export type CmsDocumentListArticleItem = CmsArticleCard & {
  _key: string;

  _type: "articleCard";
};

export type CmsDocumentListTestimonialItem = CmsTestimonialCard & {
  _key: string;

  _type: "testimonialCard";
};

export type CmsDocumentListItem =
  | CmsDocumentListResourceItem
  | CmsDocumentListArticleItem
  | CmsDocumentListTestimonialItem;

export interface CmsDynamicDocumentListItem {
  _id: string;

  _type: CmsDocumentListDynamicContentType;

  title?: string;

  summary?: string;

  path?: string;

  slug?: string;

  /** Pages have a string slug and can be nested beneath another Page. */
  isHomepage?: boolean;

  parentId?: string;

  date?: string;

  thumbnailImage?: CmsImage;

  taxonomy?: CmsDocumentListTaxonomyTerm[];

  fileType?: string;

  fileSize?: string;
}

export interface CmsDocumentListBlock {
  _key: string;

  _type: "documentListBlock";

  heading?: CmsSectionHeading;

  sourceMode?: CmsDocumentListSourceMode;

  documents?: CmsDocumentListItem[];

  dynamicContentTypes?: CmsDocumentListDynamicContentType[];

  dynamicTaxonomy?: CmsDocumentListTaxonomyReference[];

  dynamicTaxonomyMatchLogic?: CmsDocumentListTaxonomyMatchLogic;

  dynamicSort?: CmsDocumentListDynamicSort;

  dynamicLimit?: number;

  alignment?: CmsDocumentListAlignment;

  gridCols?: 1 | 2 | 3 | 4;

  enableSearch?: boolean;

  searchPlaceholder?: string;

  requireSearchQuery?: boolean;

  initialStateText?: string;

  enableFilters?: boolean;

  filterTitle?: string;

  filterLogic?: CmsDocumentListFilterLogic;

  filterOptions?: CmsDocumentListFilterOption[];

  taxonomyFilterGroups?: CmsDocumentListTaxonomyFilterGroup[];

  /** Legacy singular Taxonomy filter configuration. */
  taxonomyFilterTitle?: string;

  taxonomyFilterLogic?: CmsDocumentListFilterLogic;

  taxonomyFilterMatchLogic?: CmsDocumentListTaxonomyMatchLogic;

  filterTaxonomy?: CmsDocumentListTaxonomyReference[];

  enableSorting?: boolean;

  standardSortOptions?: CmsDocumentListStandardSort[];

  customSortOptions?: CmsDocumentListCustomSortOption[];

  /** Legacy array-based sort configuration. */
  sortOptions?: CmsDocumentListSortOption[];

  enablePagination?: boolean;

  itemsPerPage?: number;

  emptyStateText?: string;
}
