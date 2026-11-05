import type { ArticleCardProps } from "mino-ui/cards/ArticleCard";

import type { CmsArticleCard } from "@/cms/types";

import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";

import { resolveLink } from "@/cms/resolvers/link";

export async function mapArticleCard(
  card: CmsArticleCard,
): Promise<ArticleCardProps> {
  const resolvedLink = card.link ? await resolveLink(card.link) : undefined;

  const imageUrl = resolveSanityImage(card.image, { width: 960 });
  const imageDimensions = imageUrl
    ? resolveSanityImageDimensions(card.image)
    : undefined;

  const avatarUrl = resolveSanityImage(card.author?.avatar, { width: 240 });

  return {
    title: card.title,

    summary: card.summary,

    href: resolvedLink?.href,

    imageUrl,

    imageSrcSet: resolveSanityImageSrcSet(
      card.image,
      [320, 480, 640, 768, 960, 1200],
    ),

    imageSizes: "(max-width: 767px) 100vw, (max-width: 1100px) 50vw, 33vw",

    imageWidth: imageDimensions?.width,

    imageHeight: imageDimensions?.height,

    imageAlt: card.image?.alt ?? "",

    category: card.category,

    publishedAt: card.publishedAt,

    readTime: card.readTime,

    author: card.author?.name
      ? {
          name: card.author.name,

          role: card.author.role,

          avatarUrl,
        }
      : undefined,

    orientation: card.orientation ?? "vertical",

    isExternal: resolvedLink?.target === "_blank",
  };
}
