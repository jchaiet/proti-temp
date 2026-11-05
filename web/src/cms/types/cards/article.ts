import type { CmsImage } from "../image";

import type { CmsLink } from "../link";

export interface CmsArticleAuthor {
  name?: string;
  role?: string;
  avatar?: CmsImage;
}

export interface CmsArticleCard {
  _key?: string;
  _type: "articleCard";

  title: string;
  summary?: string;

  link?: CmsLink;

  image?: CmsImage;

  category?: string;
  publishedAt?: string;
  readTime?: string;

  author?: CmsArticleAuthor;

  orientation?: "vertical" | "horizontal";
}
