import type { PortableTextBlock } from "@portabletext/types";

import type { CmsSectionHeading } from "../section-heading";

export type CmsRichTextAlignment = "left" | "center" | "right";

export type CmsRichTextMaxWidth = "sm" | "md" | "lg" | "full";

export interface CmsRichTextBlock {
  _key: string;
  _type: "richTextBlock";

  heading?: CmsSectionHeading;

  content?: PortableTextBlock[];

  alignment?: CmsRichTextAlignment;

  maxWidth?: CmsRichTextMaxWidth;
}
