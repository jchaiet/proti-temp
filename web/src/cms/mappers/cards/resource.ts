import type { ResourceCardProps } from "mino-ui/cards/ResourceCard";

import type { CmsResourceCard } from "@/cms/types";

import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";

import { resolveLink } from "@/cms/resolvers/link";

export async function mapResourceCard(
  card: CmsResourceCard,
): Promise<ResourceCardProps> {
  const resolvedLink = card.link ? await resolveLink(card.link) : undefined;
  const imageDimensions = resolveSanityImageDimensions(card.image);

  return {
    title: card.title,

    summary: card.summary,

    href: resolvedLink?.href,

    imageUrl: resolveSanityImage(card.image, { width: 960 }),

    imageSrcSet: resolveSanityImageSrcSet(
      card.image,
      [320, 480, 640, 768, 960, 1200],
    ),

    imageSizes: "(max-width: 767px) 100vw, (max-width: 1100px) 50vw, 33vw",

    imageAlt: card.image?.alt ?? "",
    imageWidth: imageDimensions?.width,
    imageHeight: imageDimensions?.height,

    fileType: card.fileType,

    fileSize: card.fileSize,

    tags: card.tags ?? [],

    actionLabel: card.actionLabel ?? "Download",
  };
}
