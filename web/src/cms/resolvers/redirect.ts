import type { CmsRedirect, ResolvedRedirect } from "@/cms/types";

import { PUBLISHED_SANITY_FETCH_OPTIONS } from "@/sanity/cache";
import { sanityClient } from "@/sanity/client";
import { getPageUrl } from "@/sanity/queries/page-url";
import { isSafeRedirectPath, isSafeWebUrl } from "@/lib/security/urls";
import { REDIRECT_BY_SOURCE_QUERY } from "@/sanity/queries/redirect";

export interface ResolveRedirectOptions {
  siteId: string;
  locale: string;
  sourcePath: string;
  localePrefix?: string;
}

export type RedirectSearchParams = Record<
  string,
  string | string[] | undefined
>;

function normalizePath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return withLeadingSlash.replace(/\/+$/, "");
}

function getSourceVariants(sourcePath: string): string[] {
  const normalized = normalizePath(sourcePath);

  if (normalized === "/") {
    return ["/"];
  }

  return [normalized, `${normalized}/`];
}

function applyLocalePrefix(path: string, localePrefix: string): string {
  const normalizedPath = normalizePath(path);
  const normalizedPrefix =
    localePrefix === "/" ? "" : localePrefix.replace(/\/+$/, "");

  if (!normalizedPrefix) {
    return normalizedPath;
  }

  if (normalizedPath === "/") {
    return normalizedPrefix;
  }

  return `${normalizedPrefix}${normalizedPath}`;
}

function hasSearchParams(searchParams: RedirectSearchParams): boolean {
  return Object.values(searchParams).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== undefined;
  });
}

export function appendRedirectSearchParams(
  destination: string,
  searchParams: RedirectSearchParams,
): string {
  if (!hasSearchParams(searchParams)) {
    return destination;
  }

  const absolute = /^https?:\/\//i.test(destination);

  const url = new URL(
    destination,
    absolute ? undefined : "https://redirect.local",
  );

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }

      continue;
    }

    url.searchParams.append(key, value);
  }

  if (absolute) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

async function resolveDestination(
  redirect: CmsRedirect,
  localePrefix: string,
  siteId: string,
  locale: string,
): Promise<string | null> {
  switch (redirect.destination.type) {
    case "internal": {
      const pageId = redirect.destination.internalPageId;

      if (!pageId) {
        return null;
      }

      return getPageUrl(pageId, {
        expectedSiteId: siteId,
        expectedLocale: locale,
      });
    }

    case "path": {
      const path = redirect.destination.path;

      if (!isSafeRedirectPath(path)) {
        return null;
      }

      return applyLocalePrefix(path, localePrefix);
    }

    case "external":
      return isSafeWebUrl(redirect.destination.externalUrl)
        ? redirect.destination.externalUrl
        : null;

    default:
      return null;
  }
}

export async function resolveRedirect({
  siteId,
  locale,
  sourcePath,
  localePrefix = "",
}: ResolveRedirectOptions): Promise<ResolvedRedirect | null> {
  if (!siteId || !locale) {
    return null;
  }

  const normalizedSourcePath = normalizePath(sourcePath);

  const redirects = await sanityClient.fetch<CmsRedirect[]>(
    REDIRECT_BY_SOURCE_QUERY,
    {
      siteId,
      locale,
      sourcePaths: getSourceVariants(normalizedSourcePath),
    },
    PUBLISHED_SANITY_FETCH_OPTIONS,
  );

  /*
   * /foo and /foo/ are the same public source route. If stale CMS data
   * contains both variants, fail closed rather than choosing an arbitrary
   * Redirect from an ambiguous result set.
   */
  if (!Array.isArray(redirects) || redirects.length !== 1) {
    return null;
  }

  const redirect = redirects[0];

  if (!redirect) {
    return null;
  }

  const destination = await resolveDestination(
    redirect,
    localePrefix,
    siteId,
    locale,
  );

  if (!destination) {
    return null;
  }

  const currentPublicPath = applyLocalePrefix(
    normalizedSourcePath,
    localePrefix,
  );

  if (destination === currentPublicPath) {
    return null;
  }

  return {
    destination,
    permanent: redirect.redirectType === "permanent",
    preserveQuery: redirect.preserveQuery !== false,
  };
}
