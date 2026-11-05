import type {
  CmsArticleCard,
  CmsFullBleedCard,
  CmsResourceCard,
  CmsTestimonialCard,
} from "../cards";

import type { CmsImage } from "../image";
import type { CmsLink } from "../link";
import type { CmsCta } from "../cta";
import type { CmsCtaGroup } from "../cta-group";
import type { CmsSectionHeading } from "../section-heading";

export type CmsCarouselLayout = "default" | "split" | "split-35-65";

export type CmsCarouselAlignment = "left" | "center" | "right";

export type CmsCarouselPosition = "left" | "right";

/**
 * Standalone image item used directly
 * inside the carousel.
 */
export interface CmsCarouselImageItem {
  _key: string;
  _type: "carouselImageItem";

  image?: CmsImage;
  link?: CmsLink;
}

/**
 * Reusable card types become array items
 * when used inside CarouselBlock.
 */
export type CmsCarouselArticleItem = CmsArticleCard & {
  _key: string;
  _type: "articleCard";
};

export type CmsCarouselResourceItem = CmsResourceCard & {
  _key: string;
  _type: "resourceCard";
};

export type CmsCarouselTestimonialItem = CmsTestimonialCard & {
  _key: string;
  _type: "testimonialCard";
};

export type CmsCarouselFullBleedItem = CmsFullBleedCard & {
  _key: string;
  _type: "fullBleedCard";
};

/**
 * Every CMS-authored item supported
 * by CarouselBlock.
 *
 * `custom` remains runtime-only.
 */
export type CmsCarouselItem =
  | CmsCarouselImageItem
  | CmsCarouselArticleItem
  | CmsCarouselResourceItem
  | CmsCarouselTestimonialItem
  | CmsCarouselFullBleedItem;

export interface CmsCarouselBlock {
  _key: string;
  _type: "carouselBlock";

  // Shared section heading
  heading?: CmsSectionHeading;

  // Layout
  layout?: CmsCarouselLayout;
  alignment?: CmsCarouselAlignment;
  mediaPosition?: CmsCarouselPosition;

  // CTAs
  ctaGroup?: CmsCtaGroup;

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctas?: CmsCta[];

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctaAlignment?: CmsCarouselAlignment;
  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctaStackOnMobile?: boolean;

  // Carousel content
  items?: CmsCarouselItem[];

  // Carousel settings
  itemsPerPage?: number;
  itemsPerRow?: number;

  autoPlay?: boolean;
  autoPlayInterval?: number;

  mobilePeek?: boolean;
  grayscaleImages?: boolean;
}
