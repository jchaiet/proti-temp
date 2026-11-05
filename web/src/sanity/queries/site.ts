import { cache } from "react";

import { sanityFetch } from "@/sanity/fetch";
import type { Site } from "@/sanity/types";

const SITE_BY_DOMAIN_QUERY = `
  *[
    _type == "site" &&
    (
      $host in domains ||
      $hostname in domains
    )
  ][0]{
    _id,
    name,
    key,
    domains,
    canonicalDomain,
    defaultLocale,
    locales[]{
      code,
      label
    }
  }
`;

function normalizeHost(host: string): string {
  return host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function removePort(host: string): string {
  /*
   * localhost:3000 -> localhost
   * company.com     -> company.com
   */
  return host.replace(/:\d+$/, "");
}

export async function resolveSiteByHost(
  requestHost: string,
): Promise<Site | null> {
  const host = normalizeHost(requestHost);
  const hostname = removePort(host);

  return sanityFetch<Site | null>(SITE_BY_DOMAIN_QUERY, {
    host,
    hostname,
  });
}

/**
 * React-render-only memoized Site lookup.
 *
 * Use this from Layouts, Pages, and generateMetadata so repeated host
 * resolution within the same render does not issue duplicate CMS requests.
 * Route Handlers can continue using resolveSiteByHost directly.
 */
export const resolveSiteByHostCached = cache(resolveSiteByHost);

export interface ResolvedSiteLocale {
  code: string;
  label?: string;
}

export interface ResolvedSiteLocaleConfig {
  defaultLocale: string;

  locales: ResolvedSiteLocale[];

  /**
   * Locale codes that currently have a published CMS Homepage.
   *
   * This lets the language switcher distinguish between:
   * - an exact translated route
   * - a valid locale-homepage fallback
   * - no valid destination
   */
  homepageLocales: string[];
}

const SITE_LOCALES_BY_ID_QUERY = `
  *[
    _type == "site" &&
    _id == $siteId
  ][0]{
    defaultLocale,

    locales[]{
      code,
      label
    },

    "homepageLocales": *[
      _type == "page" &&
      site._ref == ^._id &&
      isHomepage == true &&
      defined(locale)
    ].locale
  }
`;

export async function resolveSiteLocales(
  siteId: string,
): Promise<ResolvedSiteLocaleConfig | null> {
  if (!siteId) {
    return null;
  }

  return sanityFetch<ResolvedSiteLocaleConfig | null>(
    SITE_LOCALES_BY_ID_QUERY,
    {
      siteId,
    },
  );
}
