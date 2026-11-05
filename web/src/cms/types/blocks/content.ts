import type { CmsCta } from "../cta";
import type { CmsCtaGroup } from "../cta-group";
import type { CmsImage } from "../image";
import type { CmsSectionHeading } from "../section-heading";

export type CmsContentLayout = "default" | "split" | "split-35-65";

export type CmsContentAlignment = "left" | "center" | "right";

export type CmsContentVAlignment = "top" | "center" | "bottom";

export type CmsContentMediaType = "none" | "image" | "video";

export type CmsContentDefaultMediaPosition = "above" | "below";

export type CmsContentSplitMediaPosition = "left" | "right";

export type CmsContentHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type CmsContentHeadingSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl";

export type CmsContentImageShape = "square" | "rounded" | "circle";

export type CmsContentImageSize = "sm" | "md" | "lg" | "full";

export interface CmsContentBlock {
  _key: string;
  _type: "contentBlock";

  heading?: CmsSectionHeading;

  headingLevel?: CmsContentHeadingLevel;
  headingSize?: CmsContentHeadingSize;

  layout?: CmsContentLayout;

  alignment?: CmsContentAlignment;

  vAlignment?: CmsContentVAlignment;

  mediaType?: CmsContentMediaType;

  image?: CmsImage;

  imageShape?: CmsContentImageShape;
  imageSize?: CmsContentImageSize;

  videoUrl?: string;

  defaultMediaPosition?: CmsContentDefaultMediaPosition;

  splitMediaPosition?: CmsContentSplitMediaPosition;

  ctaGroup?: CmsCtaGroup;

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctas?: CmsCta[];

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctaAlignment?: CmsContentAlignment;

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctaStackOnMobile?: boolean;
}
