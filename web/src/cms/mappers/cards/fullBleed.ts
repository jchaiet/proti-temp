import type { FullBleedCardProps } from "mino-ui/cards/FullBleedCard";

import type { CmsFullBleedCard } from "@/cms/types";

import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";

import { resolveLink } from "@/cms/resolvers/link";

export async function mapFullBleedCard(
  card: CmsFullBleedCard,
): Promise<FullBleedCardProps | null> {
  const imageSrc = resolveSanityImage(card.image, { width: 1600 });

  if (!imageSrc) {
    return null;
  }

  const link = card.link ? await resolveLink(card.link) : undefined;
  const imageDimensions = resolveSanityImageDimensions(card.image);

  return {
    imageSrc,

    imageSrcSet: resolveSanityImageSrcSet(
      card.image,
      [320, 480, 640, 768, 960, 1200, 1600],
    ),

    imageSizes: "(max-width: 767px) 100vw, 60vw",

    imageAlt: card.image?.alt ?? "",
    imageWidth: imageDimensions?.width,
    imageHeight: imageDimensions?.height,

    title: card.title,

    description: card.description ?? undefined,

    href: link?.href,

    target: link?.target,

    rel: link?.rel,

    expandable: card.expandable ?? false,
  };
}
