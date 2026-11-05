import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import type { DocumentItem } from "mino-ui/blocks/DocumentListBlock";

const mocks = vi.hoisted(() => ({
  latestProps: null as Record<string, unknown> | null,
  replace: vi.fn(),
  pathname: "/search",
  searchParams: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

vi.mock("mino-ui/blocks/DocumentListBlock", () => ({
  DocumentListBlock: (props: Record<string, unknown>) => {
    mocks.latestProps = props;

    return <div data-testid="document-list-block" />;
  },
}));

import { DocumentList } from "./DocumentList";

const documents: DocumentItem[] = [
  {
    id: "old",
    contentType: "blog",
    cardType: "article",
    title: "Old Nutrition Article",
    summary: "Older post",
    url: "/blog/old",
    date: "2026-08-01T12:00:00Z",
    tags: ["Nutrition"],
    author: {
      name: "Jane Smith",
      role: "Registered Dietitian",
    },
  },
  {
    id: "new",
    contentType: "blog",
    cardType: "article",
    title: "New Health Article",
    summary: "Newer post",
    url: "/blog/new",
    date: "2026-09-01T12:00:00Z",
    tags: ["Health"],
    author: {
      name: "Alex Doe",
      role: "Editor",
    },
  },
  {
    id: "resource",
    contentType: "resource",
    cardType: "resource",
    title: "Food Guide",
    summary: "PDF resource",
    url: "/resources/food-guide",
    tags: ["Nutrition"],
    fileType: "PDF",
    fileSize: "2 MB",
  },
];

function renderDocumentList(overrides: Record<string, unknown> = {}) {
  return render(
    <DocumentList
      props={{
        documents,
        filterLogic: "radio",
        filterOptions: [
          {
            label: "All",
            value: "all",
          },
          {
            label: "Nutrition",
            value: "nutrition",
          },
        ],
        sortOptions: [
          {
            label: "Newest",
            value: "newest",
          },
          {
            label: "Oldest",
            value: "oldest",
          },
        ],
        dateLocale: "en-US",
      }}
      sourceMode="manual"
      enableSearch
      enableSorting
      enablePagination
      itemsPerPage={2}
      {...overrides}
    />,
  );
}

function getProps() {
  return mocks.latestProps as {
    documents: DocumentItem[];
    searchQuery: string;
    selectedFilter: string | string[];
    selectedSort: string;
    currentPage: number;
    totalPages: number;
    totalResults: number;
    onSearchChange?: (query: string) => void;
    filterGroups?: Array<{
      id: string;
      selected?: string | string[];
      onChange?: (value: string | string[]) => void;
    }>;
    onFilterChange?: (filter: string | string[]) => void;
    onClearFilters?: () => void;
    onSortChange?: (sort: string) => void;
    onPageChange?: (page: number) => void;
    dateLocale?: string;
  };
}

beforeEach(() => {
  mocks.latestProps = null;
  mocks.replace.mockReset();
  mocks.pathname = "/search";
  mocks.searchParams = "";
});

it("sorts newest first using raw ISO dates before paginating", () => {
  renderDocumentList();

  const props = getProps();

  expect(props.selectedSort).toBe("newest");
  expect(props.documents.map((document) => document.id)).toEqual([
    "new",
    "old",
  ]);
  expect(props.totalResults).toBe(3);
  expect(props.totalPages).toBe(2);
  expect(props.currentPage).toBe(1);
  expect(props.dateLocale).toBe("en-US");
});

it("switches to oldest-first ordering", async () => {
  renderDocumentList();

  act(() => {
    getProps().onSortChange?.("oldest");
  });

  await waitFor(() => {
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "old",
      "new",
    ]);
  });
});

it("searches across title, tags, Author role, and resource metadata", async () => {
  renderDocumentList();

  act(() => {
    getProps().onSearchChange?.("dietitian");
  });

  await waitFor(() => {
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "old",
    ]);
    expect(getProps().totalResults).toBe(1);
  });

  act(() => {
    getProps().onSearchChange?.("pdf");
  });

  await waitFor(() => {
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "resource",
    ]);
  });
});

it("applies taxonomy-style filters case-insensitively", async () => {
  renderDocumentList();

  act(() => {
    getProps().onFilterChange?.("NUTRITION");
  });

  await waitFor(() => {
    expect(getProps().totalResults).toBe(2);
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "old",
      "resource",
    ]);
  });
});

it("moves between pages and clamps out-of-range page requests", async () => {
  renderDocumentList();

  act(() => {
    getProps().onPageChange?.(2);
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(2);
    expect(getProps().documents.map((document) => document.id)).toEqual([
      "resource",
    ]);
  });

  act(() => {
    getProps().onPageChange?.(999);
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(2);
  });

  act(() => {
    getProps().onPageChange?.(-5);
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(1);
  });
});

it("resets pagination to page 1 when search/filter/sort changes", async () => {
  renderDocumentList();

  act(() => {
    getProps().onPageChange?.(2);
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(2);
  });

  act(() => {
    getProps().onSearchChange?.("nutrition");
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(1);
  });

  act(() => {
    getProps().onFilterChange?.("nutrition");
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(1);
  });

  act(() => {
    getProps().onSortChange?.("oldest");
  });

  await waitFor(() => {
    expect(getProps().currentPage).toBe(1);
  });
});

it("passes no interactive handlers when those features are disabled", () => {
  render(
    <DocumentList
      props={{
        documents,
      }}
      sourceMode="manual"
      enableSearch={false}
      enableSorting={false}
      enablePagination={false}
      itemsPerPage={9}
    />,
  );

  const props = getProps();

  expect(props.documents).toHaveLength(3);
  expect(props.totalPages).toBe(1);
  expect(props.onSearchChange).toBeUndefined();
  expect(props.onSortChange).toBeUndefined();
  expect(props.onPageChange).toBeUndefined();
});

it("writes server-backed filter changes to the URL", async () => {
  mocks.searchParams = "q=nutrition";

  render(
    <DocumentList
      props={{
        documents: [],
        filterLogic: "radio",
        filterOptions: [
          {
            label: "Pages",
            value: "page",
          },
          {
            label: "Blog",
            value: "blog",
          },
        ],
        sortOptions: [
          {
            label: "Relevance",
            value: "relevance",
          },
          {
            label: "Newest",
            value: "newest",
          },
        ],
      }}
      sourceMode="dynamic"
      enableSearch
      enableSorting
      enablePagination
      itemsPerPage={12}
      serverState={{
        searchQuery: "nutrition",
        selectedFilter: "all",
        selectedTaxonomy: [],
        selectedSort: "relevance",
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
      }}
    />,
  );

  act(() => {
    getProps().onFilterChange?.("blog");
  });

  await waitFor(() => {
    expect(mocks.replace).toHaveBeenCalledWith(
      "/search?q=nutrition&filter=blog",
      {
        scroll: false,
      },
    );
  });
});

it("writes server-backed sort changes to the URL", async () => {
  mocks.searchParams = "q=nutrition&filter=page";

  render(
    <DocumentList
      props={{
        documents: [],
        filterLogic: "radio",
        filterOptions: [
          {
            label: "Pages",
            value: "page",
          },
        ],
        sortOptions: [
          {
            label: "Relevance",
            value: "relevance",
          },
          {
            label: "Newest",
            value: "newest",
          },
        ],
      }}
      sourceMode="dynamic"
      enableSearch
      enableSorting
      enablePagination
      itemsPerPage={12}
      serverState={{
        searchQuery: "nutrition",
        selectedFilter: "page",
        selectedSort: "relevance",
        selectedTaxonomy: [],
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
      }}
    />,
  );

  act(() => {
    getProps().onSortChange?.("newest");
  });

  await waitFor(() => {
    expect(mocks.replace).toHaveBeenCalledWith(
      "/search?q=nutrition&filter=page&sort=newest",
      {
        scroll: false,
      },
    );
  });
});

it("writes server-backed Taxonomy filter changes to a separate taxonomy URL parameter", async () => {
  mocks.searchParams = "q=nutrition&filter=blog";

  render(
    <DocumentList
      props={{
        documents: [],
        filterGroups: [
          {
            id: "content",
            title: "Content Type",
            options: [
              {
                label: "Blog",
                value: "blog",
              },
            ],
            logic: "radio",
          },
          {
            id: "taxonomy",
            title: "Topics",
            options: [
              {
                label: "Nutrition",
                value: "taxonomy-nutrition",
              },
            ],
            logic: "checkbox",
          },
        ],
      }}
      sourceMode="dynamic"
      enableSearch
      enableSorting={false}
      enablePagination
      itemsPerPage={12}
      serverState={{
        searchQuery: "nutrition",
        selectedFilter: "blog",
        selectedTaxonomy: [],
        selectedSort: "relevance",
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
      }}
    />,
  );

  const taxonomyGroup = getProps().filterGroups?.find(
    (group) => group.id === "taxonomy",
  );

  act(() => {
    taxonomyGroup?.onChange?.(["taxonomy-nutrition"]);
  });

  await waitFor(() => {
    expect(mocks.replace).toHaveBeenCalledWith(
      "/search?q=nutrition&filter=blog&taxonomy=taxonomy-nutrition",
      {
        scroll: false,
      },
    );
  });
});

it("clears content and Taxonomy filters without clearing search or sort", async () => {
  mocks.searchParams =
    "q=nutrition&filter=blog&taxonomy=taxonomy-nutrition&sort=newest&page=2";

  render(
    <DocumentList
      props={{
        documents: [],
        filterGroups: [
          {
            id: "content",
            title: "Content Type",
            options: [
              {
                label: "Blog",
                value: "blog",
              },
            ],
            logic: "radio",
          },
          {
            id: "taxonomy",
            title: "Topics",
            options: [
              {
                label: "Nutrition",
                value: "taxonomy-nutrition",
              },
            ],
            logic: "checkbox",
          },
        ],
      }}
      sourceMode="dynamic"
      enableSearch
      enableSorting
      enablePagination
      itemsPerPage={12}
      serverState={{
        searchQuery: "nutrition",
        selectedFilter: "blog",
        selectedTaxonomy: ["taxonomy-nutrition"],
        selectedSort: "newest",
        currentPage: 2,
        totalPages: 2,
        totalResults: 18,
      }}
    />,
  );

  act(() => {
    getProps().onClearFilters?.();
  });

  await waitFor(() => {
    expect(mocks.replace).toHaveBeenCalledWith(
      "/search?q=nutrition&sort=newest",
      {
        scroll: false,
      },
    );
  });
});

it("writes independent Taxonomy filter groups to group-specific URL parameters", async () => {
  mocks.searchParams = "q=asthma";

  render(
    <DocumentList
      props={{
        documents: [],
        filterGroups: [
          {
            id: "taxonomy:type",
            title: "Type",
            options: [{ label: "Article", value: "taxonomy-article" }],
            logic: "checkbox",
          },
          {
            id: "taxonomy:treatment",
            title: "Treatment",
            options: [{ label: "Asthma", value: "taxonomy-asthma" }],
            logic: "checkbox",
          },
        ],
      }}
      sourceMode="dynamic"
      enableSearch
      enableSorting={false}
      enablePagination
      itemsPerPage={12}
      serverState={{
        searchQuery: "asthma",
        selectedFilter: "all",
        selectedTaxonomy: [],
        selectedTaxonomyGroups: {
          "taxonomy:type": [],
          "taxonomy:treatment": [],
        },
        selectedSort: "newest",
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
      }}
    />,
  );

  const typeGroup = getProps().filterGroups?.find(
    (group) => group.id === "taxonomy:type",
  );

  act(() => {
    typeGroup?.onChange?.(["taxonomy-article"]);
  });

  await waitFor(() => {
    expect(mocks.replace).toHaveBeenCalledWith(
      "/search?q=asthma&taxonomy.type=taxonomy-article",
      {
        scroll: false,
      },
    );
  });
});
