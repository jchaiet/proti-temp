import type {
  CmsArticleCard,
  CmsFullBleedCard,
  CmsResourceCard,
  CmsTestimonialCard,
} from "../cards";

import type { CmsImage } from "../image";
import type { CmsLink } from "../link";
import type { CmsSectionHeading } from "../section-heading";

export type CmsGridBlockAlignment = "left" | "center" | "right";

export type CmsGridBlockLayout = "stacked" | "split";

export type CmsGridBlockPosition = "left" | "right";

export type CmsGridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface CmsGridImageItem {
  _key: string;

  _type: "gridImageItem";

  image?: CmsImage;

  link?: CmsLink;
}

export type CmsGridArticleItem = CmsArticleCard & {
  _key: string;

  _type: "articleCard";
};

export type CmsGridResourceItem = CmsResourceCard & {
  _key: string;

  _type: "resourceCard";
};

export type CmsGridTestimonialItem = CmsTestimonialCard & {
  _key: string;

  _type: "testimonialCard";
};

export type CmsGridFullBleedItem = CmsFullBleedCard & {
  _key: string;

  _type: "fullBleedCard";
};

export type CmsGridItem =
  | CmsGridImageItem
  | CmsGridArticleItem
  | CmsGridResourceItem
  | CmsGridTestimonialItem
  | CmsGridFullBleedItem;

export interface CmsGridBlock {
  _key: string;

  _type: "gridBlock";

  heading?: CmsSectionHeading;

  blockLayout?: CmsGridBlockLayout;

  alignment?: CmsGridBlockAlignment;

  gridPosition?: CmsGridBlockPosition;

  cols?: CmsGridColumns;

  items?: CmsGridItem[];

  grayscaleImages?: boolean;

  sideImage?: CmsImage;
}
