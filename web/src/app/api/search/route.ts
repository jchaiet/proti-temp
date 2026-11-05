import { NextRequest, NextResponse } from "next/server";

import { searchContent } from "@/cms/resolvers/search";

import type {
  SearchContentType,
  SearchSort,
  SearchTaxonomyMatch,
} from "@/cms/types/search";

import { resolveSiteByHost } from "@/sanity/queries/site";

export const dynamic = "force-dynamic";

// Bound unauthenticated requests before they issue a potentially expensive GROQ query.
const MAX_SEARCH_QUERY_LENGTH = 200;
const MAX_SEARCH_URL_QUERY_LENGTH = 4096;
const MAX_SEARCH_PAGE = 500;
const MAX_SEARCH_TAXONOMY_FILTERS = 25;
const MAX_SEARCH_TAXONOMY_ID_LENGTH = 128;

const VALID_TYPES = new Set<SearchContentType>(["page", "blog"]);

const VALID_SORTS = new Set<SearchSort>([
  "relevance",
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
]);

const VALID_TAXONOMY_MATCH = new Set<SearchTaxonomyMatch>(["any", "all"]);

function getRequestHost(request: NextRequest): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host");

  const hostHeader = request.headers.get("host");

  return forwardedHost?.split(",")[0]?.trim() ?? hostHeader?.trim() ?? null;
}

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

function parseTaxonomy(request: NextRequest): string[] {
  const values = request.nextUrl.searchParams
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

function getSiteLocales(site: { locales?: unknown }): string[] {
  if (!Array.isArray(site.locales)) {
    return [];
  }

  return site.locales
    .map((locale) => {
      if (typeof locale === "string") {
        return locale;
      }

      if (
        typeof locale === "object" &&
        locale !== null &&
        "code" in locale &&
        typeof (
          locale as {
            code?: unknown;
          }
        ).code === "string"
      ) {
        return (
          locale as {
            code: string;
          }
        ).code;
      }

      return null;
    })
    .filter((locale): locale is string => Boolean(locale));
}

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.search.length > MAX_SEARCH_URL_QUERY_LENGTH) {
      return NextResponse.json(
        { error: "Search request is too long." },
        { status: 414 },
      );
    }

    const host = getRequestHost(request);

    if (!host) {
      return NextResponse.json(
        {
          error: "Unable to determine request host.",
        },
        {
          status: 400,
        },
      );
    }

    const site = await resolveSiteByHost(host);

    if (!site) {
      return NextResponse.json(
        {
          error: "Site not found.",
        },
        {
          status: 404,
        },
      );
    }

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (query.length > MAX_SEARCH_QUERY_LENGTH) {
      return NextResponse.json(
        { error: "Search query is too long." },
        { status: 400 },
      );
    }

    const requestedLocale = request.nextUrl.searchParams.get("locale")?.trim();

    const locale = requestedLocale || site.defaultLocale;

    const supportedLocales = getSiteLocales(site);

    if (supportedLocales.length > 0 && !supportedLocales.includes(locale)) {
      return NextResponse.json(
        {
          error: "Unsupported locale.",
        },
        {
          status: 400,
        },
      );
    }

    const page = parsePositiveInt(request.nextUrl.searchParams.get("page"), 1);

    if (page > MAX_SEARCH_PAGE) {
      return NextResponse.json(
        { error: "Search page is out of range." },
        { status: 400 },
      );
    }

    const pageSize = Math.min(
      50,
      parsePositiveInt(request.nextUrl.searchParams.get("pageSize"), 12),
    );

    const types = parseTypes(request.nextUrl.searchParams.get("type"));

    const taxonomy = parseTaxonomy(request);

    if (
      taxonomy.length > MAX_SEARCH_TAXONOMY_FILTERS ||
      taxonomy.some((id) => id.length > MAX_SEARCH_TAXONOMY_ID_LENGTH)
    ) {
      return NextResponse.json(
        { error: "Too many or invalid taxonomy filters." },
        { status: 400 },
      );
    }

    const taxonomyMatch = parseTaxonomyMatch(
      request.nextUrl.searchParams.get("taxonomyMatch"),
    );

    const sort = parseSort(request.nextUrl.searchParams.get("sort"));

    const response = await searchContent({
      siteId: site._id,

      locale,

      query,

      page,
      pageSize,

      types,

      taxonomy,
      taxonomyMatch,

      sort,
    });

    return NextResponse.json(response, {
      headers: {
        /*
         * Search is query/host/locale-specific and should
         * reflect newly published content immediately
         * during this first implementation.
         */
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Search API failed:", error);

    return NextResponse.json(
      {
        error: "Search is temporarily unavailable.",
      },
      {
        status: 500,
      },
    );
  }
}
