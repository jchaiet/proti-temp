"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DocumentListBlock } from "mino-ui/blocks/DocumentListBlock";

import type {
  DocumentItem,
  FilterGroup,
  FilterOption,
} from "mino-ui/blocks/DocumentListBlock";

import type { MappedDocumentListBlock } from "@/cms/mappers/blocks";

const normalizeValue = (value?: string) => value?.trim().toLowerCase() ?? "";

const getDocumentFilterValues = (document: DocumentItem): string[] => {
  const values = [
    document.contentType,
    document.cardType,
    document.fileType,
    document.metaLabel,

    ...(document.tags ?? []),

    document.author?.company,
  ];

  return values
    .filter((value): value is string => Boolean(value))
    .map(normalizeValue);
};

const matchesFilter = (
  document: DocumentItem,

  selectedFilter: string | string[],
): boolean => {
  const selected = Array.isArray(selectedFilter)
    ? selectedFilter
    : [selectedFilter];

  const activeFilters = selected
    .map(normalizeValue)
    .filter((value) => value && value !== "all");

  if (activeFilters.length === 0) {
    return true;
  }

  const documentValues = getDocumentFilterValues(document);

  return activeFilters.some((filter) => documentValues.includes(filter));
};

const matchesSearch = (document: DocumentItem, query: string): boolean => {
  const normalizedQuery = normalizeValue(query);

  if (!normalizedQuery) {
    return true;
  }

  const searchableValues = [
    document.title,
    document.summary,

    document.contentType,
    document.cardType,

    document.fileType,
    document.fileSize,
    document.metaLabel,

    ...(document.tags ?? []),

    document.author?.name,
    document.author?.role,
    document.author?.title,
    document.author?.company,
  ];

  const searchableText = searchableValues
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
};

const compareDates = (
  first?: string,
  second?: string,
  direction: "asc" | "desc" = "desc",
): number => {
  const firstTime = first ? Date.parse(first) : Number.NaN;

  const secondTime = second ? Date.parse(second) : Number.NaN;

  const firstValid = Number.isFinite(firstTime);

  const secondValid = Number.isFinite(secondTime);

  if (!firstValid && !secondValid) {
    return 0;
  }

  if (!firstValid) {
    return 1;
  }

  if (!secondValid) {
    return -1;
  }

  return direction === "asc" ? firstTime - secondTime : secondTime - firstTime;
};

const parseCustomSort = (
  value: string,
): {
  field: "date" | "title" | "content-type" | "file-type";
  direction: "asc" | "desc";
} | null => {
  const match = value.match(
    /^custom:(date|title|content-type|file-type):(asc|desc)$/,
  );

  if (!match) {
    return null;
  }

  return {
    field: match[1] as "date" | "title" | "content-type" | "file-type",
    direction: match[2] as "asc" | "desc",
  };
};

const compareStrings = (
  first?: string,
  second?: string,
  direction: "asc" | "desc" = "asc",
): number => {
  const comparison = (first ?? "").localeCompare(second ?? "", undefined, {
    sensitivity: "base",
  });

  return direction === "asc" ? comparison : -comparison;
};

const sortDocuments = (
  documents: DocumentItem[],

  selectedSort: string,
): DocumentItem[] => {
  const sortValue = normalizeValue(selectedSort);

  const sorted = [...documents];
  const customSort = parseCustomSort(sortValue);

  if (customSort) {
    return sorted.sort((a, b) => {
      switch (customSort.field) {
        case "date":
          return compareDates(a.date, b.date, customSort.direction);

        case "title":
          return compareStrings(a.title, b.title, customSort.direction);

        case "content-type":
          return compareStrings(
            a.contentType,
            b.contentType,
            customSort.direction,
          );

        case "file-type":
          return compareStrings(a.fileType, b.fileType, customSort.direction);
      }
    });
  }

  switch (sortValue) {
    case "newest":
    case "date-desc":
    case "newest-first":
      return sorted.sort((a, b) => compareDates(a.date, b.date, "desc"));

    case "oldest":
    case "date-asc":
    case "oldest-first":
      return sorted.sort((a, b) => compareDates(a.date, b.date, "asc"));

    case "title-asc":
    case "a-z":
      return sorted.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        }),
      );

    case "title-desc":
    case "z-a":
      return sorted.sort((a, b) =>
        b.title.localeCompare(a.title, undefined, {
          sensitivity: "base",
        }),
      );

    default:
      return sorted;
  }
};

const getInitialFilter = (
  filterLogic: "radio" | "checkbox",
): string | string[] => (filterLogic === "checkbox" ? [] : "all");

const getInitialSort = (
  sortOptions: MappedDocumentListBlock["props"]["sortOptions"],
): string => sortOptions?.[0]?.value ?? "";

const isTaxonomyGroupId = (groupId: string): boolean =>
  groupId === "taxonomy" || groupId.startsWith("taxonomy:");

const getTaxonomyParamName = (groupId: string): string => {
  if (groupId === "taxonomy") {
    return "taxonomy";
  }

  return `taxonomy.${groupId.slice("taxonomy:".length)}`;
};

function LocalDocumentList({
  props,
  enableSearch,
  enableSorting,
  enablePagination,
  itemsPerPage,
}: MappedDocumentListBlock) {
  const {
    documents,

    filterLogic = "radio",

    filterOptions = [],

    sortOptions = [],

    ...blockProps
  } = props;

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFilter, setSelectedFilter] = useState<string | string[]>(() =>
    getInitialFilter(filterLogic),
  );

  const [selectedSort, setSelectedSort] = useState(() =>
    getInitialSort(sortOptions),
  );

  const [requestedPage, setRequestedPage] = useState(1);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const searchMatches =
        !enableSearch || matchesSearch(document, searchQuery);

      const filterMatches =
        filterOptions.length === 0 || matchesFilter(document, selectedFilter);

      return searchMatches && filterMatches;
    });
  }, [documents, enableSearch, searchQuery, filterOptions, selectedFilter]);

  const sortedDocuments = useMemo(() => {
    if (!enableSorting) {
      return filteredDocuments;
    }

    return sortDocuments(filteredDocuments, selectedSort);
  }, [filteredDocuments, enableSorting, selectedSort]);

  const safeItemsPerPage = Math.max(1, itemsPerPage);

  const totalResults = sortedDocuments.length;

  const totalPages = enablePagination
    ? Math.max(1, Math.ceil(totalResults / safeItemsPerPage))
    : 1;

  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);

  const visibleDocuments = useMemo(() => {
    if (!enablePagination) {
      return sortedDocuments;
    }

    const startIndex = (currentPage - 1) * safeItemsPerPage;

    return sortedDocuments.slice(startIndex, startIndex + safeItemsPerPage);
  }, [sortedDocuments, enablePagination, currentPage, safeItemsPerPage]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    setRequestedPage(1);
  };

  const handleFilterChange = (filter: string | string[]) => {
    setSelectedFilter(filter);

    setRequestedPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);

    setRequestedPage(1);
  };

  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);

    setRequestedPage(nextPage);
  };

  return (
    <DocumentListBlock
      {...blockProps}
      documents={visibleDocuments}
      filterLogic={filterLogic}
      filterOptions={filterOptions as FilterOption[]}
      sortOptions={enableSorting ? sortOptions : []}
      searchQuery={searchQuery}
      selectedFilter={selectedFilter}
      selectedSort={selectedSort}
      currentPage={currentPage}
      totalPages={totalPages}
      totalResults={totalResults}
      onSearchChange={enableSearch ? handleSearchChange : undefined}
      onFilterChange={filterOptions.length > 0 ? handleFilterChange : undefined}
      onSortChange={
        enableSorting && sortOptions.length > 0 ? handleSortChange : undefined
      }
      onPageChange={enablePagination ? handlePageChange : undefined}
    />
  );
}

type ServerDocumentListProps = MappedDocumentListBlock & {
  serverState: NonNullable<MappedDocumentListBlock["serverState"]>;
};

function ServerDocumentList({
  props,
  enableSearch,
  enableSorting,
  enablePagination,
  serverState,
}: ServerDocumentListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  const state = serverState;

  const {
    documents,
    filterLogic = "radio",
    filterOptions = [],
    filterGroups = [],
    sortOptions = [],
    ...blockProps
  } = props;

  const [queryState, setQueryState] = useState(() => ({
    value: state.searchQuery,
    responseQuery: state.searchQuery,
  }));

  const localQuery =
    queryState.responseQuery === state.searchQuery
      ? queryState.value
      : state.searchQuery;

  const setLocalQuery = (value: string) => {
    setQueryState({
      value,
      responseQuery: state.searchQuery,
    });
  };

  const replaceParams = useCallback(
    (update: (params: URLSearchParams) => void) => {
      if (pathname === null) return;

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      update(params);

      const queryString = params.toString();

      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.replace(nextUrl, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!enableSearch || localQuery === state.searchQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      replaceParams((params) => {
        const value = localQuery.trim();

        if (value) {
          params.set("q", value);
        } else {
          params.delete("q");
        }

        params.delete("page");
      });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [enableSearch, localQuery, replaceParams, state.searchQuery]);

  const handleFilterChange = (value: string | string[]) => {
    const values = Array.isArray(value) ? value : [value];

    replaceParams((params) => {
      params.delete("filter");

      for (const filter of values) {
        if (filter && filter !== "all") {
          params.append("filter", filter);
        }
      }

      params.delete("page");
    });
  };

  const handleTaxonomyChange = (groupId: string, value: string | string[]) => {
    const values = Array.isArray(value) ? value : [value];
    const paramName = getTaxonomyParamName(groupId);

    replaceParams((params) => {
      params.delete(paramName);

      for (const taxonomy of values) {
        if (taxonomy && taxonomy !== "all") {
          params.append(paramName, taxonomy);
        }
      }

      params.delete("page");
    });
  };

  const handleClearFilters = () => {
    replaceParams((params) => {
      params.delete("filter");
      params.delete("taxonomy");

      for (const key of Array.from(params.keys())) {
        if (key.startsWith("taxonomy.")) {
          params.delete(key);
        }
      }

      params.delete("page");
    });
  };

  const resolvedFilterGroups: FilterGroup[] = filterGroups.map((group) => {
    if (isTaxonomyGroupId(group.id)) {
      const selected =
        state.selectedTaxonomyGroups?.[group.id] ??
        (group.id === "taxonomy" ? state.selectedTaxonomy : undefined);

      return {
        ...group,
        selected: selected ?? (group.logic === "checkbox" ? [] : "all"),
        onChange: (value) => handleTaxonomyChange(group.id, value),
      };
    }

    return {
      ...group,
      selected: state.selectedFilter,
      onChange: handleFilterChange,
    };
  });

  const handleSortChange = (sort: string) => {
    replaceParams((params) => {
      if (sort) {
        params.set("sort", sort);
      } else {
        params.delete("sort");
      }

      params.delete("page");
    });
  };

  const handlePageChange = (page: number) => {
    replaceParams((params) => {
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
    });
  };

  return (
    <DocumentListBlock
      {...blockProps}
      documents={documents}
      filterLogic={filterLogic}
      filterOptions={filterOptions as FilterOption[]}
      filterGroups={resolvedFilterGroups}
      sortOptions={enableSorting ? sortOptions : []}
      searchQuery={localQuery}
      selectedFilter={state.selectedFilter}
      selectedSort={state.selectedSort}
      currentPage={state.currentPage}
      totalPages={state.totalPages}
      totalResults={state.totalResults}
      onSearchChange={enableSearch ? setLocalQuery : undefined}
      onFilterChange={filterOptions.length > 0 ? handleFilterChange : undefined}
      onClearFilters={
        resolvedFilterGroups.length > 0 ? handleClearFilters : undefined
      }
      onSortChange={
        enableSorting && sortOptions.length > 0 ? handleSortChange : undefined
      }
      onPageChange={
        enablePagination && state.totalPages > 1 ? handlePageChange : undefined
      }
      isLoading={isPending}
    />
  );
}

export function DocumentList(props: MappedDocumentListBlock) {
  if (props.sourceMode === "dynamic" && props.serverState) {
    return <ServerDocumentList {...props} serverState={props.serverState} />;
  }

  return <LocalDocumentList {...props} />;
}
