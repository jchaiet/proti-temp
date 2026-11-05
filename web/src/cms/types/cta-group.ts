import type { CmsCta } from "./cta";

export type CmsCtaAlignment = "left" | "center" | "right";

export interface CmsCtaGroup {
  items?: CmsCta[];
  alignment?: CmsCtaAlignment;
  stackOnMobile?: boolean;
}
