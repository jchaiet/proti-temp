import type { CmsAuthorPage } from "@/cms/types/author";
import type { CmsBlog, ResolvedRedirect } from "@/cms/types";

import { getAuthorPage } from "@/cms/resolvers/author";
import {
  getBlogTaxonomyPage,
  type BlogTaxonomyPage,
} from "@/cms/resolvers/blog-taxonomy";
import { getBlogBySlug } from "@/cms/resolvers/blog";
import { resolveRedirect } from "@/cms/resolvers/redirect";

import { segmentsToPath } from "@/lib/routing/locale";
import {
  getAuthorSlug,
  getBlogSlug,
  getBlogTaxonomySegments,
} from "@/lib/routing/route-shapes";

import {
  resolvePageBySegments,
  type ResolvedPage,
} from "@/sanity/queries/page";

export {
  getAuthorSlug,
  getBlogSlug,
  getBlogTaxonomySegments,
} from "@/lib/routing/route-shapes";

export interface ResolveRouteOptions {
  siteId: string;
  locale: string;
  segments: string[];
  localePrefix?: string;
  explicitDefaultLocale?: boolean;
  visualEditing?: boolean;
}

export type ResolvedRoute =
  | {
      type: "redirect";
      redirect: ResolvedRedirect;
    }
  | {
      type: "canonicalRedirect";
      destination: string;
    }
  | {
      type: "author";
      authorPage: CmsAuthorPage;
    }
  | {
      type: "taxonomy";
      taxonomyPage: BlogTaxonomyPage;
    }
  | {
      type: "blog";
      blog: CmsBlog;
    }
  | {
      type: "page";
      page: ResolvedPage;
    }
  | {
      type: "notFound";
    };

/**
 * Resolve the public route contract for the catch-all Next.js route.
 *
 * Precedence intentionally matches the application runtime:
 *
 *   CMS Redirect
 *   -> explicit default-locale canonicalization
 *   -> Author profile route
 *   -> Blog Taxonomy route
 *   -> Blog detail route
 *   -> Page Builder route
 *   -> 404
 *
 * Reserved route shapes fail closed. For example, /blog/missing is a missing
 * Blog rather than falling through to an unrelated Page with the same path.
 */
export async function resolveRoute({
  siteId,
  locale,
  segments,
  localePrefix = "",
  explicitDefaultLocale = false,
  visualEditing = false,
}: ResolveRouteOptions): Promise<ResolvedRoute> {
  if (!siteId || !locale) {
    return { type: "notFound" };
  }

  const sourcePath = segmentsToPath(segments);

  /*
   * Draft Preview deliberately ignores authored CMS Redirects so an editor can
   * inspect the draft content that still exists at a redirected route. Public
   * requests keep the normal Redirect-first contract.
   */
  if (!visualEditing) {
    const resolvedRedirect = await resolveRedirect({
      siteId,
      locale,
      sourcePath,
      localePrefix,
    });

    if (resolvedRedirect) {
      return {
        type: "redirect",
        redirect: resolvedRedirect,
      };
    }
  }

  if (explicitDefaultLocale) {
    return {
      type: "canonicalRedirect",
      destination: sourcePath,
    };
  }

  const authorSlug = getAuthorSlug(segments);

  if (authorSlug) {
    const authorPage = await getAuthorPage({
      siteId,
      locale,
      slug: authorSlug,
      ...(visualEditing ? { visualEditing: true } : {}),
    });

    return authorPage
      ? {
          type: "author",
          authorPage,
        }
      : { type: "notFound" };
  }

  const taxonomySegments = getBlogTaxonomySegments(segments);

  if (taxonomySegments) {
    const taxonomyPage = await getBlogTaxonomyPage({
      siteId,
      locale,
      segments: taxonomySegments,
      ...(visualEditing ? { visualEditing: true } : {}),
    });

    return taxonomyPage
      ? {
          type: "taxonomy",
          taxonomyPage,
        }
      : { type: "notFound" };
  }

  const blogSlug = getBlogSlug(segments);

  if (blogSlug) {
    const blog = await getBlogBySlug({
      siteId,
      locale,
      slug: blogSlug,
      ...(visualEditing ? { visualEditing: true } : {}),
    });

    return blog
      ? {
          type: "blog",
          blog,
        }
      : { type: "notFound" };
  }

  const page = visualEditing
    ? await resolvePageBySegments(siteId, locale, segments, {
        visualEditing: true,
      })
    : await resolvePageBySegments(siteId, locale, segments);

  return page
    ? {
        type: "page",
        page,
      }
    : { type: "notFound" };
}
