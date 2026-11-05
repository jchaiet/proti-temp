import type { CmsCta } from "../cta";
import type { CmsCtaGroup } from "../cta-group";

import type { CmsSectionHeading } from "../section-heading";

export type CmsAccordionAlignment = "left" | "center" | "right";

export type CmsAccordionLayout = "default" | "split" | "split-35-65";

export type CmsAccordionPosition = "left" | "right";

export interface CmsAccordionItem {
  _key: string;
  _type: "accordionItem";

  title: string;
  content: string;

  defaultOpen?: boolean;
}

export interface CmsAccordionBlock {
  _key: string;
  _type: "accordionBlock";

  heading?: CmsSectionHeading;

  layout?: CmsAccordionLayout;

  alignment?: CmsAccordionAlignment;

  accordionPosition?: CmsAccordionPosition;

  ctaGroup?: CmsCtaGroup;

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctas?: CmsCta[];

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctaAlignment?: CmsAccordionAlignment;

  /** @deprecated Read-only compatibility for pre-ctaGroup Sanity documents. */
  ctaStackOnMobile?: boolean;

  items?: CmsAccordionItem[];

  multiple?: boolean;
}
