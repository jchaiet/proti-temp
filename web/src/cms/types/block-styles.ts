export type CmsBlockVerticalPadding =
  | "default"
  | "none"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl";

export type CmsBlockBackground =
  | "default"
  | "canvas"
  | "surface"
  | "brand-muted";

export type CmsBlockContentWidth =
  | "default"
  | "narrow"
  | "standard"
  | "wide"
  | "full";

export interface CmsBlockStyles {
  verticalPadding?: CmsBlockVerticalPadding;
  background?: CmsBlockBackground;
  contentWidth?: CmsBlockContentWidth;
}
