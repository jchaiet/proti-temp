import type {
  DocumentItem,
  DocumentListBlockProps,
  FilterGroup,
  FilterOption,
  SortOption,
} from "mino-ui/blocks/DocumentListBlock";

import type {
  CmsDocumentListBlock,
  CmsDocumentListItem,
  CmsDocumentListDynamicSort,
  CmsDocumentListTaxonomyMatchLogic,
} from "@/cms/types";
import type { SearchResponse, SearchSort } from "@/cms/types/search";

import {
  mapArticleCard,
  mapResourceCard,
  mapTestimonialCard,
} from "@/cms/mappers/cards";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

import { resolveDynamicDocumentList } from "@/cms/resolvers/document-list";
import { searchContent } from "@/cms/resolvers/search";

import { siteLocaleToLanguageTag } from "@/lib/routing/locale";
import { getAppMessages } from "@/i18n/messages";
import type { DocumentListSortLabels } from "@/i18n/types";

export type DocumentListMappedProps = Omit<
  DocumentListBlockProps,
  | "searchQuery"
  | "selectedFilter"
  | "selectedSort"
  | "onSearchChange"
  | "onFilterChange"
  | "onSortChange"
  | "currentPage"
  | "totalPages"
  | "totalResults"
  | "onPageChange"
  | "isLoading"
>;

export interface ServerDocumentListState {
  searchQuery: string;

  selectedFilter: string | string[];

  /** Legacy singular Taxonomy selection. */
  selectedTaxonomy: string | string[];

  selectedTaxonomyGroups?: Record<string, string | string[]>;

  selectedSort: string;

  currentPage: number;
  totalPages: number;
  totalResults: number;
}

export interface MappedDocumentListBlock {
  props: DocumentListMappedProps;

  sourceMode: "manual" | "dynamic";

  enableSearch: boolean;

  enableSorting: boolean;

  enablePagination: boolean;

  itemsPerPage: number;

  serverState?: ServerDocumentListState;
}

export interface DocumentListMapperContext {
  siteId: string;
  locale: string;
  localePrefix?: string;
  visualEditing?: boolean;

  searchParams?: Record<string, string | string[] | undefined>;
}

const VALID_LISTING_SORTS = new Set<CmsDocumentListDynamicSort>([
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
]);

function isListingSort(value: SearchSort): value is CmsDocumentListDynamicSort {
  return VALID_LISTING_SORTS.has(value as CmsDocumentListDynamicSort);
}

async function mapManualDocumentListItem(
  item: CmsDocumentListItem,
): Promise<DocumentItem | null> {
  switch (item._type) {
    case "articleCard": {
      const article = await mapArticleCard(item);

      if (!article) {
        return null;
      }

      return {
        id: item._key,

        contentType: "article",

        cardType: "article",

        title: article.title,

        summary: article.summary,

        url: article.href ?? "",

        date: article.publishedAt,

        tags: article.category ? [article.category] : [],

        thumbnail: article.imageUrl,
        ...(article.imageUrl && article.imageWidth && article.imageHeight
          ? {
              thumbnailWidth: article.imageWidth,
              thumbnailHeight: article.imageHeight,
            }
          : {}),
        ...(article.imageUrl && article.imageAlt
          ? { thumbnailAlt: article.imageAlt }
          : {}),

        author: article.author
          ? {
              name: article.author.name,

              role: article.author.role,

              avatarUrl: article.author.avatarUrl,
            }
          : undefined,
      };
    }

    case "resourceCard": {
      const resource = await mapResourceCard(item);

      if (!resource) {
        return null;
      }

      return {
        id: item._key,

        contentType: "resource",

        cardType: "resource",

        title: resource.title,

        summary: resource.summary,

        url: resource.href ?? "",

        thumbnail: resource.imageUrl,
        ...(resource.imageUrl && resource.imageWidth && resource.imageHeight
          ? {
              thumbnailWidth: resource.imageWidth,
              thumbnailHeight: resource.imageHeight,
            }
          : {}),
        ...(resource.imageUrl && resource.imageAlt
          ? { thumbnailAlt: resource.imageAlt }
          : {}),

        tags: resource.tags ?? [],

        fileType: resource.fileType,

        fileSize: resource.fileSize,

        metaLabel: resource.fileSize,
      };
    }

    case "testimonialCard": {
      const testimonial = await mapTestimonialCard(item);

      if (!testimonial) {
        return null;
      }

      return {
        id: item._key,

        cardType: "testimonial",

        title: testimonial.author.name,

        summary: testimonial.quote,

        url: "",

        thumbnail: testimonial.author.avatarUrl,

        metaLabel: testimonial.author.company,

        rating: testimonial.rating,

        companyLogoUrl: testimonial.companyLogoUrl,
        ...(testimonial.companyLogoUrl &&
        testimonial.companyLogoWidth &&
        testimonial.companyLogoHeight
          ? {
              companyLogoWidth: testimonial.companyLogoWidth,
              companyLogoHeight: testimonial.companyLogoHeight,
            }
          : {}),

        author: {
          name: testimonial.author.name,

          title: testimonial.author.title,

          company: testimonial.author.company,

          avatarUrl: testimonial.author.avatarUrl,
        },
      };
    }

    default:
      return null;
  }
}

async function mapManualDocumentListItems(
  items: CmsDocumentListItem[] | undefined,
): Promise<DocumentItem[]> {
  if (!items?.length) {
    return [];
  }

  const mapped = await Promise.all(items.map(mapManualDocumentListItem));

  return mapped.filter((item): item is DocumentItem => item !== null);
}

function normalizeControlValue(value?: string): string {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function mapFilterOptions(block: CmsDocumentListBlock): FilterOption[] {
  if (!block.enableFilters || !block.filterOptions?.length) {
    return [];
  }

  return block.filterOptions
    .map((option) => ({
      label: option.label?.trim() ?? "",
      value: normalizeControlValue(option.value),
    }))
    .filter((option) => Boolean(option.label) && Boolean(option.value));
}

function normalizeSortValue(value?: string): SearchSort | null {
  const normalized = normalizeControlValue(value);

  switch (normalized) {
    case "relevance":
      return "relevance";

    case "newest":
    case "date-desc":
    case "newest-first":
      return "newest";

    case "oldest":
    case "date-asc":
    case "oldest-first":
      return "oldest";

    case "title-asc":
    case "a-z":
      return "title-asc";

    case "title-desc":
    case "z-a":
      return "title-desc";

    default:
      if (
        /^custom:(date|title|content-type|file-type):(asc|desc)$/.test(
          normalized,
        )
      ) {
        return normalized as SearchSort;
      }

      return null;
  }
}

function makeCustomSortValue(
  field?: string,
  direction?: string,
): SearchSort | null {
  const normalizedField = normalizeControlValue(field);
  const normalizedDirection = normalizeControlValue(direction);

  return normalizeSortValue(`custom:${normalizedField}:${normalizedDirection}`);
}

function dedupeSortOptions(options: SortOption[]): SortOption[] {
  const seen = new Set<string>();

  return options.filter((option) => {
    if (!option.value || seen.has(option.value)) {
      return false;
    }

    seen.add(option.value);
    return true;
  });
}

function mapSortOptions(
  block: CmsDocumentListBlock,
  labels: DocumentListSortLabels,
): SortOption[] {
  if (!block.enableSorting) {
    return [];
  }

  const usesModernSortConfiguration =
    Array.isArray(block.standardSortOptions) ||
    Array.isArray(block.customSortOptions);

  if (usesModernSortConfiguration) {
    const standard = (block.standardSortOptions ?? []).flatMap((value) => {
      const normalized = normalizeSortValue(value);

      if (!normalized || normalized.startsWith("custom:")) {
        return [];
      }

      return [
        {
          label: labels[normalized as keyof DocumentListSortLabels],
          value: normalized,
        },
      ];
    });

    const custom = (block.customSortOptions ?? []).flatMap((option) => {
      const label = option.label?.trim() ?? "";
      const value = makeCustomSortValue(option.field, option.direction);

      if (!label || !value) {
        return [];
      }

      return [
        {
          label,
          value,
        },
      ];
    });

    return dedupeSortOptions([...standard, ...custom]);
  }

  if (!block.sortOptions?.length) {
    return [];
  }

  return dedupeSortOptions(
    block.sortOptions.flatMap((option) => {
      const value = normalizeSortValue(option.value);

      if (!value || value.startsWith("custom:")) {
        return [];
      }

      return [
        {
          label: labels[value as keyof DocumentListSortLabels],
          value,
        },
      ];
    }),
  );
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

type MappedTaxonomyFilterGroup = {
  id: string;
  paramName: string;
  title: string;
  options: FilterOption[];
  logic: "radio" | "checkbox";
  matchLogic: CmsDocumentListTaxonomyMatchLogic;
};

function mapTaxonomyTerms(
  terms: CmsDocumentListBlock["filterTaxonomy"],
): FilterOption[] {
  if (!terms?.length) {
    return [];
  }

  return terms.flatMap((term) => {
    const value = cleanId(term._ref ?? term._id);
    const label = term.title?.trim() ?? "";

    if (
      !value ||
      !label ||
      term.kind === "group" ||
      term.includeInFilters === false
    ) {
      return [];
    }

    return [
      {
        label,
        value,
      },
    ];
  });
}

function sanitizeFilterGroupKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

function mapTaxonomyFilterGroups(
  block: CmsDocumentListBlock,
): MappedTaxonomyFilterGroup[] {
  if (!block.enableFilters || block.sourceMode !== "dynamic") {
    return [];
  }

  if (Array.isArray(block.taxonomyFilterGroups)) {
    return block.taxonomyFilterGroups.flatMap((group, index) => {
      const title = group.title?.trim() ?? "";
      const options = mapTaxonomyTerms(group.taxonomy);
      const key = sanitizeFilterGroupKey(group._key ?? String(index + 1));

      if (!title || options.length === 0 || !key) {
        return [];
      }

      const logic = group.logic === "radio" ? "radio" : "checkbox";

      return [
        {
          id: `taxonomy:${key}`,
          paramName: `taxonomy.${key}`,
          title,
          options,
          logic,
          matchLogic:
            logic === "checkbox" && group.matchLogic === "all" ? "all" : "any",
        },
      ];
    });
  }

  const legacyOptions = mapTaxonomyTerms(block.filterTaxonomy);

  if (legacyOptions.length === 0) {
    return [];
  }

  return [
    {
      id: "taxonomy",
      paramName: "taxonomy",
      title: block.taxonomyFilterTitle ?? "Topics",
      options: legacyOptions,
      logic: block.taxonomyFilterLogic ?? "checkbox",
      matchLogic: block.taxonomyFilterMatchLogic ?? "any",
    },
  ];
}

function getDynamicTaxonomyIds(block: CmsDocumentListBlock): string[] {
  if (!block.dynamicTaxonomy?.length) {
    return [];
  }

  return block.dynamicTaxonomy
    .filter((term) => term.kind !== "group")
    .map((term) => cleanId(term._ref ?? term._id))
    .filter(Boolean);
}

function toUrlSearchParams(
  record: DocumentListMapperContext["searchParams"],
): URLSearchParams {
  const params = new URLSearchParams();

  if (!record) {
    return params;
  }

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }

      continue;
    }

    params.set(key, value);
  }

  return params;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseParamValues(params: URLSearchParams, key: string): string[] {
  return Array.from(
    new Set(
      params
        .getAll(key)
        .flatMap((value) => value.split(","))
        .map(normalizeControlValue)
        .filter(Boolean),
    ),
  );
}

function getSelectedFilter(
  filterLogic: "radio" | "checkbox",
  filterValues: string[],
): string | string[] {
  if (filterLogic === "checkbox") {
    return filterValues;
  }

  return filterValues[0] ?? "all";
}

function hasActiveSelection(value: string | string[] | undefined): boolean {
  const values = Array.isArray(value) ? value : [value];

  return values.some((item) => {
    const normalized = normalizeControlValue(item);

    return Boolean(normalized && normalized !== "all");
  });
}

function hasActiveServerFilters(
  state: ServerDocumentListState | undefined,
): boolean {
  if (!state) {
    return false;
  }

  if (
    hasActiveSelection(state.selectedFilter) ||
    hasActiveSelection(state.selectedTaxonomy)
  ) {
    return true;
  }

  return Object.values(state.selectedTaxonomyGroups ?? {}).some((value) =>
    hasActiveSelection(value),
  );
}

function resolveRequestedSort({
  block,
  query,
  params,
  sortOptions,
}: {
  block: CmsDocumentListBlock;
  query: string;
  params: URLSearchParams;
  sortOptions: SortOption[];
}): SearchSort {
  const requested = normalizeSortValue(params.get("sort") ?? undefined);

  if (
    block.enableSorting &&
    requested &&
    sortOptions.some((option) => option.value === requested)
  ) {
    return requested;
  }

  if (query && block.enableSorting) {
    const relevanceOption = sortOptions.find(
      (option) => option.value === "relevance",
    );

    if (relevanceOption) {
      return "relevance";
    }

    const configuredDefault = sortOptions[0]?.value;

    const normalizedDefault = normalizeSortValue(configuredDefault);

    if (normalizedDefault) {
      return normalizedDefault;
    }
  }

  if (query) {
    return "relevance";
  }

  return block.dynamicSort ?? "newest";
}

function resolveListingSort({
  block,
  params,
  sortOptions,
}: {
  block: CmsDocumentListBlock;
  params: URLSearchParams;
  sortOptions: SortOption[];
}): CmsDocumentListDynamicSort {
  const requested = normalizeSortValue(params.get("sort") ?? undefined);

  if (
    block.enableSorting &&
    requested &&
    requested !== "relevance" &&
    isListingSort(requested) &&
    sortOptions.some((option) => option.value === requested)
  ) {
    return requested;
  }

  return block.dynamicSort ?? "newest";
}

function normalizeFilterValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function getDocumentFilterValues(document: DocumentItem): string[] {
  return [
    document.contentType,
    document.cardType,
    document.fileType,
    document.fileSize,
    document.metaLabel,
    ...(document.tags ?? []),
    document.author?.company,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeFilterValue);
}

function filterDocuments(
  documents: DocumentItem[],
  filterValues: string[],
): DocumentItem[] {
  const activeFilters = filterValues
    .map(normalizeFilterValue)
    .filter((value) => value && value !== "all");

  if (activeFilters.length === 0) {
    return documents;
  }

  return documents.filter((document) => {
    const values = getDocumentFilterValues(document);

    return activeFilters.some((filter) => values.includes(filter));
  });
}

function paginateDocuments({
  documents,
  requestedPage,
  itemsPerPage,
  enablePagination,
}: {
  documents: DocumentItem[];
  requestedPage: number;
  itemsPerPage: number;
  enablePagination: boolean;
}): {
  documents: DocumentItem[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
} {
  const totalResults = documents.length;

  if (!enablePagination) {
    return {
      documents,
      currentPage: 1,
      totalPages: 1,
      totalResults,
    };
  }

  const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const start = (currentPage - 1) * itemsPerPage;

  return {
    documents: documents.slice(start, start + itemsPerPage),
    currentPage,
    totalPages,
    totalResults,
  };
}

function mapSearchResult(
  result: SearchResponse["results"][number],
): DocumentItem {
  const isResource = result.type === "resource";

  return {
    id: result.id,

    contentType: result.type,

    cardType: isResource ? "resource" : "article",

    title: result.title,

    summary: result.description,

    url: result.href,

    date: result.date,

    thumbnail: result.imageUrl,
    ...(result.imageUrl && result.imageWidth && result.imageHeight
      ? {
          thumbnailWidth: result.imageWidth,
          thumbnailHeight: result.imageHeight,
        }
      : {}),
    ...(result.imageUrl && result.imageAlt
      ? { thumbnailAlt: result.imageAlt }
      : {}),

    tags: result.taxonomy?.map((item) => item.title),

    fileType: result.fileType,

    fileSize: result.fileSize,

    metaLabel: isResource ? result.fileSize : undefined,

    author: result.author
      ? {
          name: result.author.name,
          role: result.author.jobTitle,
        }
      : undefined,
  };
}

async function resolveServerDocumentList({
  block,
  context,
  filterOptions,
  taxonomyFilterGroups,
  sortOptions,
  itemsPerPage,
  enablePagination,
}: {
  block: CmsDocumentListBlock;
  context: DocumentListMapperContext;
  filterOptions: FilterOption[];
  taxonomyFilterGroups: MappedTaxonomyFilterGroup[];
  sortOptions: SortOption[];
  itemsPerPage: number;
  enablePagination: boolean;
}): Promise<{
  documents: DocumentItem[];
  state: ServerDocumentListState;
}> {
  const params = toUrlSearchParams(context.searchParams);

  const query =
    block.enableSearch === false ? "" : (params.get("q")?.trim() ?? "");

  const filterLogic = block.filterLogic ?? "radio";

  const allowedFilterValues = new Set(
    filterOptions.map((option) => normalizeControlValue(option.value)),
  );

  const requestedFilterValues =
    filterOptions.length > 0
      ? parseParamValues(params, "filter").filter((value) =>
          allowedFilterValues.has(value),
        )
      : [];

  const filterValues =
    filterLogic === "radio"
      ? requestedFilterValues.slice(0, 1)
      : requestedFilterValues;

  const selectedTaxonomyGroups: Record<string, string | string[]> = {};
  const activeTaxonomyGroups: {
    taxonomy: string[];
    taxonomyMatch: CmsDocumentListTaxonomyMatchLogic;
  }[] = [];

  for (const group of taxonomyFilterGroups) {
    const allowedValues = new Set(
      group.options.map((option) => normalizeControlValue(option.value)),
    );

    const requestedValues = parseParamValues(params, group.paramName).filter(
      (value) => allowedValues.has(value),
    );

    const values =
      group.logic === "radio" ? requestedValues.slice(0, 1) : requestedValues;

    selectedTaxonomyGroups[group.id] = getSelectedFilter(group.logic, values);

    if (values.length > 0) {
      activeTaxonomyGroups.push({
        taxonomy: values,
        taxonomyMatch: group.matchLogic,
      });
    }
  }

  const legacyTaxonomyGroup = taxonomyFilterGroups.find(
    (group) => group.id === "taxonomy",
  );

  const legacyTaxonomyValues = legacyTaxonomyGroup
    ? (() => {
        const selected = selectedTaxonomyGroups[legacyTaxonomyGroup.id];
        return (Array.isArray(selected) ? selected : [selected])
          .map(normalizeControlValue)
          .filter((value) => value && value !== "all");
      })()
    : [];

  const selectedTaxonomy = legacyTaxonomyGroup
    ? (selectedTaxonomyGroups[legacyTaxonomyGroup.id] ?? [])
    : [];

  const requestedPage = enablePagination
    ? parsePositiveInt(params.get("page"), 1)
    : 1;

  const contentTypes = block.dynamicContentTypes ?? [];

  const requiresSearchQuery =
    block.requireSearchQuery === true &&
    (block.enableSearch !== false || block.enableFilters === true);

  const hasActiveFilters =
    filterValues.some((value) => value && value !== "all") ||
    activeTaxonomyGroups.some((group) => group.taxonomy.length > 0);

  const makeState = ({
    searchQuery,
    selectedSort,
    currentPage = 1,
    totalPages = 1,
    totalResults = 0,
  }: {
    searchQuery: string;
    selectedSort: string;
    currentPage?: number;
    totalPages?: number;
    totalResults?: number;
  }): ServerDocumentListState => ({
    searchQuery,
    selectedFilter: getSelectedFilter(filterLogic, filterValues),
    selectedTaxonomy,
    selectedTaxonomyGroups,
    selectedSort,
    currentPage,
    totalPages,
    totalResults,
  });

  if (requiresSearchQuery && !query && !hasActiveFilters) {
    const selectedSort = resolveRequestedSort({
      block,
      query,
      params,
      sortOptions,
    });

    return {
      documents: [],
      state: makeState({
        searchQuery: "",
        selectedSort,
      }),
    };
  }

  if (contentTypes.length === 0) {
    const selectedSort = query
      ? resolveRequestedSort({ block, query, params, sortOptions })
      : resolveListingSort({ block, params, sortOptions });

    return {
      documents: [],
      state: makeState({
        searchQuery: query,
        selectedSort,
      }),
    };
  }

  const taxonomyIds = getDynamicTaxonomyIds(block);
  const dynamicLimit = Math.min(Math.max(block.dynamicLimit ?? 50, 1), 200);
  const includesPages = contentTypes.includes("page");
  const requestedSort = normalizeSortValue(params.get("sort") ?? undefined);
  const requiresSearchSort =
    requestedSort === "relevance" ||
    requestedSort?.startsWith("custom:") === true;

  /*
   * Any active visitor search uses the full Search resolver so matching is not
   * limited to the initial Dynamic result window. Page listings also use the
   * Search resolver even before a query so nested Page URLs can be assembled
   * from their parent hierarchy instead of assuming every Page is top-level.
   * Taxonomy filter groups and custom/relevance visitor sorts also require the
   * Search resolver because their behavior is richer than the lightweight
   * listing query.
   */
  if (
    query ||
    hasActiveFilters ||
    includesPages ||
    taxonomyFilterGroups.length > 0 ||
    requiresSearchSort
  ) {
    const sort = resolveRequestedSort({
      block,
      query,
      params,
      sortOptions,
    });

    const usesLegacyTaxonomy = Boolean(legacyTaxonomyGroup);

    const response = await searchContent({
      siteId: context.siteId,
      locale: context.locale,

      query,
      includeAllOnEmptyQuery: !query,

      page: requestedPage,
      pageSize: enablePagination ? itemsPerPage : 1000,

      types: contentTypes,

      taxonomy: usesLegacyTaxonomy ? legacyTaxonomyValues : [],
      taxonomyMatch: legacyTaxonomyGroup?.matchLogic ?? "any",
      taxonomyGroups: usesLegacyTaxonomy ? undefined : activeTaxonomyGroups,

      taxonomyScope: taxonomyIds,
      taxonomyScopeMatch: block.dynamicTaxonomyMatchLogic ?? "any",

      sort,
      filters: filterValues,

      /*
       * A Document List is an editorial listing rather than an SEO index. Keep
       * explicitly selected content eligible even when its crawler indexing
       * setting is noindex or its canonical points elsewhere.
       */
      respectSeoVisibility: false,

      maxResults: query || hasActiveFilters ? undefined : dynamicLimit,
    });

    return {
      documents: response.results.map(mapSearchResult),

      state: makeState({
        searchQuery: response.query,
        selectedSort: response.sort,
        currentPage: response.page,
        totalPages: Math.max(1, response.totalPages),
        totalResults: response.total,
      }),
    };
  }

  const listingSort = resolveListingSort({
    block,
    params,
    sortOptions,
  });

  const listingDocuments = await resolveDynamicDocumentList({
    siteId: context.siteId,
    locale: context.locale,
    localePrefix: context.localePrefix,
    contentTypes,
    taxonomyIds,
    taxonomyMatchLogic: block.dynamicTaxonomyMatchLogic ?? "any",
    sort: listingSort,
    limit: dynamicLimit,
    visualEditing: context.visualEditing,
  });

  const filteredDocuments = filterDocuments(listingDocuments, filterValues);
  const paginated = paginateDocuments({
    documents: filteredDocuments,
    requestedPage,
    itemsPerPage,
    enablePagination,
  });

  return {
    documents: paginated.documents,
    state: makeState({
      searchQuery: "",
      selectedSort: listingSort,
      currentPage: paginated.currentPage,
      totalPages: paginated.totalPages,
      totalResults: paginated.totalResults,
    }),
  };
}

export async function mapDocumentListBlock(
  block: CmsDocumentListBlock,
  context: DocumentListMapperContext,
): Promise<MappedDocumentListBlock> {
  const sourceMode = block.sourceMode ?? "manual";

  const heading = mapSectionHeading(block.heading);

  const filterOptions = mapFilterOptions(block);

  const taxonomyFilterGroups = mapTaxonomyFilterGroups(block);

  const filterGroups: FilterGroup[] =
    sourceMode === "dynamic"
      ? [
          ...(filterOptions.length > 0
            ? [
                {
                  id: "content",
                  title: block.filterTitle ?? "Categories",
                  options: filterOptions,
                  logic: block.filterLogic ?? "radio",
                } satisfies FilterGroup,
              ]
            : []),
          ...taxonomyFilterGroups.map(
            (group) =>
              ({
                id: group.id,
                title: group.title,
                options: group.options,
                logic: group.logic,
              }) satisfies FilterGroup,
          ),
        ]
      : [];

  const documentListMessages = getAppMessages(context.locale).documentList;

  const { sortOptions: sortOptionLabels, ...documentListLabels } =
    documentListMessages;

  const sortOptions = mapSortOptions(block, sortOptionLabels);

  const enableSearch = block.enableSearch ?? true;

  const enableSorting = block.enableSorting ?? false;

  const enablePagination = block.enablePagination ?? true;

  const itemsPerPage = Math.max(1, block.itemsPerPage ?? 9);

  let documents: DocumentItem[];

  let serverState: ServerDocumentListState | undefined;

  if (sourceMode === "dynamic") {
    const resolved = await resolveServerDocumentList({
      block,
      context,
      filterOptions,
      taxonomyFilterGroups,
      sortOptions,
      itemsPerPage,
      enablePagination,
    });

    documents = resolved.documents;
    serverState = resolved.state;
  } else {
    documents = await mapManualDocumentListItems(block.documents);
  }

  return {
    props: {
      ...heading,

      documents,

      labels: documentListLabels,

      dateLocale: siteLocaleToLanguageTag(context.locale),

      alignment: block.alignment ?? "left",

      gridCols: block.gridCols ?? 3,

      filterOptions,

      filterGroups,

      filterTitle: block.filterTitle ?? "Categories",

      filterLogic: block.filterLogic ?? "radio",

      sortOptions,

      searchPlaceholder: block.searchPlaceholder ?? "Search documents...",

      emptyStateText:
        sourceMode === "dynamic" &&
        block.requireSearchQuery === true &&
        !serverState?.searchQuery &&
        !hasActiveServerFilters(serverState)
          ? (block.initialStateText ??
            "Enter a search term or select a filter to begin.")
          : (block.emptyStateText ??
            "No documents found matching your criteria."),
    },

    sourceMode,

    enableSearch,

    enableSorting,

    enablePagination,

    itemsPerPage,

    serverState,
  };
}
