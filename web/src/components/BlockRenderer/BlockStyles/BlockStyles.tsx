import type { ReactNode } from "react";

import type {
  CmsBlockBackground,
  CmsBlockContentWidth,
  CmsBlockStyles,
  CmsBlockVerticalPadding,
} from "@/cms/types/block-styles";

import styles from "./styles.module.css";

export interface BlockStylesProps {
  config?: CmsBlockStyles;
  children: ReactNode;
}

type BlockPaddingOverride = Exclude<CmsBlockVerticalPadding, "default">;
type BlockBackgroundOverride = Exclude<CmsBlockBackground, "default">;
type BlockContentWidthOverride = Exclude<CmsBlockContentWidth, "default">;

const paddingClasses: Record<BlockPaddingOverride, string> = {
  none: styles.paddingNone,
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
  xl: styles.paddingXl,
  "2xl": styles.padding2xl,
  "3xl": styles.padding3xl,
};

const backgroundClasses: Record<BlockBackgroundOverride, string> = {
  canvas: styles.backgroundCanvas,
  surface: styles.backgroundSurface,
  "brand-muted": styles.backgroundBrandMuted,
};

const widthClasses: Record<BlockContentWidthOverride, string> = {
  narrow: styles.widthNarrow,
  standard: styles.widthStandard,
  wide: styles.widthWide,
  full: styles.widthFull,
};

export function BlockStyles({ config, children }: BlockStylesProps) {
  const verticalPadding: CmsBlockVerticalPadding =
    config?.verticalPadding ?? "default";
  const background: CmsBlockBackground = config?.background ?? "default";
  const contentWidth: CmsBlockContentWidth = config?.contentWidth ?? "default";

  if (
    verticalPadding === "default" &&
    background === "default" &&
    contentWidth === "default"
  ) {
    return children;
  }

  const className = [
    styles.root,
    verticalPadding !== "default" ? paddingClasses[verticalPadding] : undefined,
    background !== "default" ? backgroundClasses[background] : undefined,
    contentWidth !== "default" ? widthClasses[contentWidth] : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      data-block-padding={verticalPadding}
      data-block-background={background}
      data-block-content-width={contentWidth}
    >
      {children}
    </div>
  );
}
