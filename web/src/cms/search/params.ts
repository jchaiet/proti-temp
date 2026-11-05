import type {
  SearchContentType,
  SearchSort,
  SearchTaxonomyMatch,
} from "@/cms/types/search";

export interface ParsedSearchParams {
  query: string;

  page: number;
  pageSize: number;

  types: SearchContentType[];

  taxonomy: string[];
  taxonomyMatch: SearchTaxonomyMatch;

  sort: SearchSort;
}

export type SearchParamRecord = Record<string, string | string[] | undefined>;

const VALID_TYPES = new Set<SearchContentType>([
  "page",
  "article",
  "blog",
  "news",
  "resource",
]);

const VALID_SORTS = new Set<SearchSort>([
  "relevance",
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
]);

const VALID_TAXONOMY_MATCH = new Set<SearchTaxonomyMatch>(["any", "all"]);

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTypes(value: string | null): SearchContentType[] {
  if (!value) {
    return ["page", "blog"];
  }

  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is SearchContentType =>
      VALID_TYPES.has(item as SearchContentType),
    );

  return parsed.length > 0 ? Array.from(new Set(parsed)) : ["page", "blog"];
}

function parseTaxonomy(params: URLSearchParams): string[] {
  const values = params
    .getAll("taxonomy")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(values));
}

function parseSort(value: string | null): SearchSort {
  if (value && VALID_SORTS.has(value as SearchSort)) {
    return value as SearchSort;
  }

  return "relevance";
}

function parseTaxonomyMatch(value: string | null): SearchTaxonomyMatch {
  if (value && VALID_TAXONOMY_MATCH.has(value as SearchTaxonomyMatch)) {
    return value as SearchTaxonomyMatch;
  }

  return "any";
}

export function searchParamRecordToUrlSearchParams(
  record: SearchParamRecord,
): URLSearchParams {
  const params = new URLSearchParams();

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

export function parseSearchParams(params: URLSearchParams): ParsedSearchParams {
  return {
    query: params.get("q")?.trim() ?? "",

    page: parsePositiveInt(params.get("page"), 1),

    pageSize: Math.min(50, parsePositiveInt(params.get("pageSize"), 12)),

    types: parseTypes(params.get("type")),

    taxonomy: parseTaxonomy(params),

    taxonomyMatch: parseTaxonomyMatch(params.get("taxonomyMatch")),

    sort: parseSort(params.get("sort")),
  };
}
