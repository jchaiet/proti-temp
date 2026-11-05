import type {
  AuthorLocaleLinks,
  CmsAuthor,
  CmsAuthorArticle,
  CmsAuthorPage,
} from "@/cms/types/author";

import type { CmsImage } from "@/cms/types";

import {
  portableTextToMarkdown,
  portableTextToPlainText,
  type PortableTextValue,
} from "@/cms/resolvers/portable-text-markdown";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import { buildLocaleLinks } from "@/lib/routing/public-url";

import { sanityFetch } from "@/sanity/fetch";

export interface GetAuthorBySlugOptions {
  siteId: string;
  locale: string;
  slug: string;
  visualEditing?: boolean;
}

export type GetAuthorPageOptions = GetAuthorBySlugOptions;

export interface BuildAuthorLocaleLinksOptions {
  slug: string;

  defaultLocale: string;

  locales?: Array<{
    code?: string;
  }>;

  domains?: string[];
  canonicalDomain?: string;
  availableLocales?: string[];
}

type AuthorQueryRecord = Omit<
  CmsAuthor,
  "bio" | "bioPortableText" | "bioRichText" | "imageUrl" | "imageAlt"
> & {
  bioPortableText?: PortableTextValue;
  bioLegacy?: string;

  defaultLocale?: string;
  translatedLocales?: string[];

  image?: CmsImage;
};

type AuthorArticleQueryRecord = Omit<
  CmsAuthorArticle,
  "imageUrl" | "imageAlt"
> & {
  image?: CmsImage;
};

const AUTHOR_BY_SLUG_QUERY = `
  *[
    _type == "author" &&
    site._ref == $siteId &&
    slug.current == $slug
  ][0]{
    _id,
    _type,
    _createdAt,
    _updatedAt,

    "siteId": site._ref,
    "defaultLocale": site->defaultLocale,
    "translatedLocales": translations[defined(name) && name != ""].locale,

    "slug": slug.current,

    "name": coalesce(
      translations[
        locale == $locale
      ][0].name,
      name
    ),

    "jobTitle": coalesce(
      translations[
        locale == $locale
      ][0].jobTitle,
      jobTitle
    ),

    "expertise": coalesce(
      translations[
        locale == $locale
      ][0].expertise,
      expertise
    ),

    credentials[]{
      name,
      category,
      identifier,
      recognizedBy,
      url
    },

    "affiliation": select(
      defined(affiliationName) => {
        "name": affiliationName,
        "url": affiliationUrl
      }
    ),

    "bioPortableText": coalesce(
      translations[
        locale == $locale
      ][0].bioRichText,
      bioRichText
    ),

    "bioLegacy": coalesce(
      translations[
        locale == $locale
      ][0].bio,
      bio
    ),

    "image": {
      "asset": image.asset,
      "crop": image.crop,
      "hotspot": image.hotspot,

      "alt": coalesce(
        translations[
          locale == $locale
        ][0].imageAlt,
        image.alt,
        ""
      )
    },

    profileUrl,
    sameAs
  }
`;

const AUTHOR_ARTICLES_QUERY = `
  *[
    _type == "blog" &&
    site._ref == $siteId &&
    locale == $locale &&
    author._ref == $authorId
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

    "slug": slug.current,

    publishedAt,

    "image": {
      "asset": mainImage.asset,
      "crop": mainImage.crop,
      "hotspot": mainImage.hotspot,
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

      "slug": slug.current
    }
  }
`;

export async function getAuthorBySlug({
  siteId,
  locale,
  slug,
  visualEditing = false,
}: GetAuthorBySlugOptions): Promise<CmsAuthor | null> {
  if (!siteId || !locale || !slug) {
    return null;
  }

  const record = await sanityFetch<AuthorQueryRecord | null>(
    AUTHOR_BY_SLUG_QUERY,
    {
      siteId,
      locale,
      slug,
    },
    { visualEditing },
  );

  if (!record) {
    return null;
  }

  const {
    bioPortableText,
    bioLegacy,
    defaultLocale,
    translatedLocales,
    image,
    ...author
  } = record;

  const richText = portableTextToMarkdown(bioPortableText);

  const plainText = portableTextToPlainText(bioPortableText);

  return {
    ...author,

    bio: plainText || bioLegacy || undefined,

    bioPortableText: bioPortableText?.length ? bioPortableText : undefined,

    bioRichText: richText || bioLegacy || undefined,

    imageUrl: resolveSanityImagePreset(image, "avatar"),

    socialImageUrl: resolveSanityImagePreset(image, "social"),

    imageAlt: image?.alt ?? "",

    availableLocales: Array.from(
      new Set(
        [
          defaultLocale,
          ...(Array.isArray(translatedLocales) ? translatedLocales : []),
        ].filter((value): value is string => Boolean(value)),
      ),
    ),
  };
}

export async function getAuthorPage({
  siteId,
  locale,
  slug,
  visualEditing = false,
}: GetAuthorPageOptions): Promise<CmsAuthorPage | null> {
  const author = await getAuthorBySlug({
    siteId,
    locale,
    slug,
    visualEditing,
  });

  if (!author) {
    return null;
  }

  const articleRecords = await sanityFetch<AuthorArticleQueryRecord[]>(
    AUTHOR_ARTICLES_QUERY,
    {
      siteId,
      locale,
      authorId: author._id,
    },
    { visualEditing },
  );

  const articles: CmsAuthorArticle[] = articleRecords.map(
    ({ image, ...article }) => ({
      ...article,

      imageUrl: resolveSanityImagePreset(image, "card"),

      imageAlt: image?.alt ?? "",
    }),
  );

  return {
    locale,
    author,
    articles,
  };
}

export function buildAuthorLocaleLinks({
  slug,
  defaultLocale,
  locales = [],
  domains = [],
  canonicalDomain,
  availableLocales,
}: BuildAuthorLocaleLinksOptions): AuthorLocaleLinks {
  return buildLocaleLinks({
    routePath: `/authors/${slug}`,
    defaultLocale,
    locales,
    domains,
    canonicalDomain,
    availableLocales,
  });
}
