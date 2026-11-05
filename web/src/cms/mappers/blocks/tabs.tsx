import type { TabItem, TabsBlockProps } from "mino-ui/blocks/TabsBlock";

import type { CmsTabsBlock, CmsTabsItem } from "@/cms/types";

import { CmsRichText } from "@/components/CmsRichText";

import { mapCtaGroup } from "@/cms/mappers/cta-group";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

import {
  resolveSanityImage,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";

import { SANITY_RESPONSIVE_WIDTHS } from "@/cms/resolvers/image-widths";

async function mapTabsItem(item: CmsTabsItem): Promise<TabItem> {
  const ctaGroup = await mapCtaGroup(item.ctaGroup, {
    legacyItems: item.ctas,
    legacyAlignment: item.ctaAlignment,
    legacyStackOnMobile: item.ctaStackOnMobile,
    fallbackAlignment: "left",
  });

  const imageSrc =
    item.mediaType === "image"
      ? resolveSanityImage(item.image, { width: 1200 })
      : undefined;
  const imageSrcSet =
    item.mediaType === "image"
      ? resolveSanityImageSrcSet(item.image, SANITY_RESPONSIVE_WIDTHS.standard)
      : undefined;

  const videoSrc = item.mediaType === "video" ? item.videoUrl : undefined;

  return {
    id: item._key,

    label: item.label,

    badge: item.badge,

    content: item.content?.length ? (
      <CmsRichText value={item.content} mode="block" />
    ) : undefined,

    imageSrc,

    imageSrcSet,

    imageSizes: imageSrc ? "(max-width: 767px) 100vw, 50vw" : undefined,

    imageAlt: item.image?.alt ?? "",

    videoSrc,

    ctas: ctaGroup.ctas,

    ctaGroupProps: ctaGroup.ctaGroupProps,
  };
}

async function mapTabsItems(
  items: CmsTabsItem[] | undefined,
): Promise<TabItem[]> {
  if (!items?.length) {
    return [];
  }

  return Promise.all(items.map(mapTabsItem));
}

export async function mapTabsBlock(
  block: CmsTabsBlock,
): Promise<TabsBlockProps> {
  const heading = mapSectionHeading(block.heading);

  const items = await mapTabsItems(block.items);

  const defaultItem = block.items?.find((item) => item.defaultActive);

  return {
    ...heading,

    alignment: block.alignment ?? "left",

    /*
     * Horizontal is the only variant
     * confirmed by the uploaded block.
     */
    variant: "horizontal",

    defaultActiveId: defaultItem?._key ?? block.items?.[0]?._key,

    items,
  };
}
