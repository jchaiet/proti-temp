export type CmsSeoIndexing = "inherit" | "index" | "noindex";

export type CmsSeoFollowing = "inherit" | "follow" | "nofollow";

export interface CmsSeo {
  metaTitle?: string;
  metaDescription?: string;

  socialImageUrl?: string;
  socialImageAlt?: string;

  canonicalUrl?: string;

  indexing?: CmsSeoIndexing;
  following?: CmsSeoFollowing;
}

export interface CmsSiteSeoDefaults {
  locale: string;

  siteTitle?: string;
  titleTemplate?: string;

  metaDescription?: string;

  socialImageUrl?: string;
  socialImageAlt?: string;

  indexing?: Exclude<CmsSeoIndexing, "inherit">;

  following?: Exclude<CmsSeoFollowing, "inherit">;
}

export interface CmsSiteSeo {
  _id: string;

  name: string;

  domains?: string[];
  canonicalDomain?: string;

  defaultLocale: string;

  defaults?: CmsSiteSeoDefaults;
}
