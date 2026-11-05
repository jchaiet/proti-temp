import type { CmsBlock } from "./block";
import type { CmsSeo } from "./seo";
import type { CmsAuthor } from "./author";

export interface CmsTaxonomyTerm {
  _id: string;
  _type: "taxonomy";

  title: string;
  slug: string;

  parentId?: string;

  /**
   * Full hierarchical taxonomy path.
   *
   * Examples:
   * category/nutrition
   * type/video
   * specialty/orthopedics/knee
   */
  path?: string;
}

export interface CmsCitationSource {
  title: string;
  publisher?: string;
  publicationDate?: string;
  url?: string;
}

export interface CmsBlog {
  _id: string;
  _type: "blog";

  _updatedAt?: string;

  siteId: string;
  locale: string;

  title: string;
  summary?: string;
  showSummaryInArticle?: boolean;

  slug: string;
  publishedAt?: string;
  lastModifiedAt?: string;
  reviewedAt?: string;

  imageUrl?: string;
  imageSrcSet?: string;
  imageWidth?: number;
  imageHeight?: number;
  socialImageUrl?: string;
  imageAlt?: string;

  author?: CmsAuthor;
  reviewer?: CmsAuthor;

  sources?: CmsCitationSource[];

  seo?: CmsSeo;

  taxonomy?: CmsTaxonomyTerm[];

  sections?: CmsBlock[];
}
