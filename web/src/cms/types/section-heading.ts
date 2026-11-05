import type { PortableTextBlock } from "@portabletext/types";

export type CmsSectionHeadingTextAlignment =
  | "inherit"
  | "left"
  | "center"
  | "right";

export interface CmsSectionHeading {
  eyebrow?: PortableTextBlock[];

  title?: PortableTextBlock[];

  description?: PortableTextBlock[];

  disclaimer?: PortableTextBlock[];

  /**
   * Controls text alignment inside the section heading only.
   *
   * This is intentionally separate from each block's placement alignment
   * (for example Hero hAlignment or ContentBlock alignment).
   */
  textAlignment?: CmsSectionHeadingTextAlignment;
}
