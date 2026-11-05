import type { PortableTextBlock } from "@portabletext/types";

import type { RichTextBlockProps } from "mino-ui/blocks/RichTextBlock";

import type { CmsRichTextBlock } from "@/cms/types";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

export interface MappedRichTextBlockProps extends Omit<
  RichTextBlockProps,
  "content"
> {
  content: PortableTextBlock[];
}

export function mapRichTextBlock(
  block: CmsRichTextBlock,
): MappedRichTextBlockProps {
  const heading = mapSectionHeading(block.heading);

  return {
    ...heading,

    content: block.content ?? [],

    alignment: block.alignment ?? "left",

    maxWidth: block.maxWidth ?? "md",
  };
}
