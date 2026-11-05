import type { CmsImage } from "@/cms/types";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import { buildLocaleLinks } from "@/lib/routing/public-url";

import { sanityFetch } from "@/sanity/fetch";

export interface BlogTaxonomyTerm {
  _id: string;

  title: string;

  slug: string;
}

export interface BlogTaxonomyDocument {
  _id: string;

  title: string;

  description?: string;

  slug: string;

  parentId?: string;

  path: string;
}

export interface BlogTaxonomyListItem {
  _id: string;

  title: string;

  summary?: string;

  slug: string;

  publishedAt?: string;

  imageUrl?: string;

  imageAlt?: string;

  taxonomy?: BlogTaxonomyTerm[];
}

export interface BlogTaxonomyPage {
  taxonomy: BlogTaxonomyDocument;

  blogs: BlogTaxonomyListItem[];
}

export interface GetBlogTaxonomyPageOptions {
  siteId: string;

  locale: string;

  segments: string[];

  visualEditing?: boolean;
}

export interface BuildBlogTaxonomyLocaleLinksOptions {
  path: string;

  defaultLocale: string;

  locales?: Array<{
    code?: string;
  }>;

  domains?: string[];
  canonicalDomain?: string;
}

export interface BlogTaxonomyLocaleLinks {
  localeHrefs: Record<string, string>;

  languageAlternates: Record<string, string>;
}

type TaxonomyDocumentRecord = Omit<BlogTaxonomyDocument, "path">;

type BlogTaxonomyListRecord = Omit<
  BlogTaxonomyListItem,
  "imageUrl" | "imageAlt"
> & {
  image?: CmsImage;
};

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

function normalizeSegments(segments: string[]): string[] {
  return segments
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
}

function buildTaxonomyPath(
  document: TaxonomyDocumentRecord,

  documentsById: Map<string, TaxonomyDocumentRecord>,
): string[] | null {
  const segments: string[] = [];

  const visited = new Set<string>();

  let current: TaxonomyDocumentRecord | undefined = document;

  while (current) {
    const currentId = cleanId(current._id);

    if (visited.has(currentId)) {
      return null;
    }

    visited.add(currentId);

    if (!current.slug) {
      return null;
    }

    segments.unshift(current.slug);

    const parentId = cleanId(current.parentId);

    if (!parentId) {
      break;
    }

    current = documentsById.get(parentId);

    if (!current) {
      return null;
    }
  }

  return segments;
}

async function resolveTaxonomyBySegments({
  siteId,
  locale,
  segments,
  visualEditing = false,
}: GetBlogTaxonomyPageOptions): Promise<BlogTaxonomyDocument | null> {
  const normalizedSegments = normalizeSegments(segments);

  if (!siteId || !locale || normalizedSegments.length === 0) {
    return null;
  }

  const taxonomyDocuments = await sanityFetch<TaxonomyDocumentRecord[]>(
    `
        *[
          _type == "taxonomy" &&
          site._ref == $siteId
        ]{
          _id,

          "title": coalesce(
            translations[
              locale == $locale
            ][0].title,
            title
          ),

          "description": coalesce(
            translations[
              locale == $locale
            ][0].description,
            description
          ),

          "slug": slug.current,

          "parentId":
            parent._ref
        }
      `,
    {
      siteId,
      locale,
    },
    { visualEditing },
  );

  const documentsById = new Map<string, TaxonomyDocumentRecord>(
    taxonomyDocuments.map((document) => [cleanId(document._id), document]),
  );

  const targetPath = normalizedSegments.join("/");

  for (const document of taxonomyDocuments) {
    const documentPath = buildTaxonomyPath(document, documentsById);

    if (!documentPath) {
      continue;
    }

    const path = documentPath.join("/");

    if (path === targetPath) {
      return {
        ...document,
        path,
      };
    }
  }

  return null;
}

async function getBlogsByTaxonomyId({
  siteId,
  locale,
  taxonomyId,
  visualEditing = false,
}: {
  siteId: string;

  locale: string;

  taxonomyId: string;

  visualEditing?: boolean;
}): Promise<BlogTaxonomyListItem[]> {
  const records = await sanityFetch<BlogTaxonomyListRecord[]>(
    `
        *[
          _type == "blog" &&
          site._ref == $siteId &&
          locale == $locale &&
          $taxonomyId in taxonomy[]._ref
        ]
          | order(
            coalesce(
              publishedAt,
              _createdAt
            ) desc
          )
        {
          _id,
          title,
          summary,

          "slug":
            slug.current,

          publishedAt,

          "image": {
            "asset":
              mainImage.asset,

            "crop":
              mainImage.crop,

            "hotspot":
              mainImage.hotspot,

            "alt": coalesce(
              mainImage.alt,
              ""
            )
          },

          taxonomy[]->{
            _id,

            "title": coalesce(
              translations[
                locale == $locale
              ][0].title,
              title
            ),

            "slug":
              slug.current
          }
        }
      `,
    {
      siteId,
      locale,

      taxonomyId: cleanId(taxonomyId),
    },
    { visualEditing },
  );

  return records.map(({ image, ...blog }) => ({
    ...blog,

    imageUrl: resolveSanityImagePreset(image, "card"),

    imageAlt: image?.alt ?? "",
  }));
}

export async function getBlogTaxonomyPage(
  options: GetBlogTaxonomyPageOptions,
): Promise<BlogTaxonomyPage | null> {
  const taxonomy = await resolveTaxonomyBySegments(options);

  if (!taxonomy) {
    return null;
  }

  const blogs = await getBlogsByTaxonomyId({
    siteId: options.siteId,

    locale: options.locale,

    taxonomyId: taxonomy._id,

    visualEditing: options.visualEditing,
  });

  return {
    taxonomy,
    blogs,
  };
}

export function buildBlogTaxonomyLocaleLinks({
  path,
  defaultLocale,
  locales = [],
  domains = [],
  canonicalDomain,
}: BuildBlogTaxonomyLocaleLinksOptions): BlogTaxonomyLocaleLinks {
  return buildLocaleLinks({
    routePath: `/blog/${path}`,
    defaultLocale,
    locales,
    domains,
    canonicalDomain,
  });
}
