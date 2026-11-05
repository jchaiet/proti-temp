import type { PortableTextBlock } from "@portabletext/types";

import type { CmsCta } from "../cta";
import type { CmsCtaGroup } from "../cta-group";

import type { CmsImage } from "../image";

import type { CmsSectionHeading } from "../section-heading";

export type CmsTabsAlignment = "left" | "center" | "right";

export type CmsTabsMediaType = "none" | "image" | "video";

export interface CmsTabsItem {
  _key: string;
  _type: "tabsItem";

  label: string;

  badge?: string;

  defaultActive?: boolean;

  content?: PortableTextBlock[];

  mediaType?: CmsTabsMediaType;

  image?: CmsImage;

  videoUrl?: string;

  ctaGroup?: CmsCtaGroup;

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctas?: CmsCta[];

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctaAlignment?: CmsTabsAlignment;

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctaStackOnMobile?: boolean;
}

export interface CmsTabsBlock {
  _key: string;
  _type: "tabsBlock";

  heading?: CmsSectionHeading;

  alignment?: CmsTabsAlignment;

  items?: CmsTabsItem[];
}
