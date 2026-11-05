import type { PortableTextBlock } from "@portabletext/types";

export interface CmsAuthorCredential {
  name: string;
  category?: string;
  identifier?: string;
  recognizedBy?: string;
  url?: string;
}

export interface CmsAuthorAffiliation {
  name: string;
  url?: string;
}

export interface CmsAuthor {
  _id: string;

  _type: "author";

  _createdAt?: string;
  _updatedAt?: string;

  siteId: string;

  slug: string;

  name: string;

  jobTitle?: string;

  expertise?: string[];

  credentials?: CmsAuthorCredential[];

  affiliation?: CmsAuthorAffiliation;

  /**
   * Plain text used by SEO / structured data.
   */
  bio?: string;

  /**
   * Native Portable Text used by the Author page so
   * textStyle annotations, links, lists and headings survive.
   */
  bioPortableText?: PortableTextBlock[];

  /**
   * Backwards-compatible Markdown / legacy fallback.
   */
  bioRichText?: string;

  imageUrl?: string;

  socialImageUrl?: string;

  imageAlt?: string;

  profileUrl?: string;

  sameAs?: string[];

  /** Locales with a real default/translated Author representation. */
  availableLocales?: string[];
}

export interface CmsAuthorArticleTaxonomy {
  _id: string;

  title: string;

  slug?: string;
}

export interface CmsAuthorArticle {
  _id: string;

  title: string;

  summary?: string;

  slug: string;

  publishedAt?: string;

  imageUrl?: string;

  imageAlt?: string;

  taxonomy?: CmsAuthorArticleTaxonomy[];
}

export interface CmsAuthorPage {
  locale: string;

  author: CmsAuthor;

  articles: CmsAuthorArticle[];
}

export interface AuthorLocaleLinks {
  localeHrefs: Record<string, string>;

  languageAlternates: Record<string, string>;
}
