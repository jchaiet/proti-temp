import type { CmsIcon } from "./icon";
import type { CmsLink, CmsReference } from "./link";

export type CmsCtaActionType = "link" | "modal";

export interface CmsCta {
  _key?: string;

  label: string;

  /**
   * Optional for backward compatibility. Existing CTA documents that predate
   * this field are treated as normal links.
   */
  actionType?: CmsCtaActionType;

  link?: CmsLink;
  modal?: CmsReference;

  variant?: "primary" | "secondary" | "link" | "glass";

  size?: "sm" | "md" | "lg";

  inverted?: boolean;

  icon?: CmsIcon;

  iconAlignment?: "left" | "right";
}
