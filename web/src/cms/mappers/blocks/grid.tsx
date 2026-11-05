import type {
  GridBlockItemConfig,
  GridBlockProps,
} from "mino-ui/blocks/GridBlock";

import type { CmsGridBlock, CmsGridItem } from "@/cms/types";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

import {
  mapArticleCard,
  mapFullBleedCard,
  mapResourceCard,
  mapTestimonialCard,
} from "@/cms/mappers/cards";

import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";

import { SANITY_RESPONSIVE_WIDTHS } from "@/cms/resolvers/image-widths";

import { resolveLink } from "@/cms/resolvers/link";

async function mapGridItem(
  item: CmsGridItem,
  imageSizes: string,
): Promise<GridBlockItemConfig | null> {
  switch (item._type) {
    case "gridImageItem": {
      const imageSrc = resolveSanityImage(item.image, { width: 1200 });

      if (!imageSrc) {
        return null;
      }

      const link = item.link ? await resolveLink(item.link) : undefined;
      const imageDimensions = resolveSanityImageDimensions(item.image);

      return {
        id: item._key,

        type: "image",

        imageSrc,

        imageSrcSet: resolveSanityImageSrcSet(
          item.image,
          SANITY_RESPONSIVE_WIDTHS.standard,
        ),

        imageSizes,

        imageWidth: imageDimensions?.width,
        imageHeight: imageDimensions?.height,

        imageAlt: item.image?.alt ?? "",

        href: link?.href,

        target: link?.target,

        rel: link?.rel,
      };
    }

    case "articleCard": {
      const article = await mapArticleCard(item);

      if (!article) {
        return null;
      }

      return {
        id: item._key,

        type: "article",

        article,
      };
    }

    case "resourceCard": {
      const resource = await mapResourceCard(item);

      if (!resource) {
        return null;
      }

      return {
        id: item._key,

        type: "resource",

        resource,
      };
    }

    case "testimonialCard": {
      const testimonial = await mapTestimonialCard(item);

      if (!testimonial) {
        return null;
      }

      return {
        id: item._key,

        type: "testimonial",

        testimonial,
      };
    }

    case "fullBleedCard": {
      const fullBleed = await mapFullBleedCard(item);

      if (!fullBleed) {
        return null;
      }

      return {
        id: item._key,

        type: "fullBleed",

        fullBleed,
      };
    }

    default:
      return null;
  }
}

async function mapGridItems(
  items: CmsGridItem[] | undefined,
  imageSizes: string,
): Promise<GridBlockItemConfig[]> {
  if (!items?.length) {
    return [];
  }

  const mapped = await Promise.all(
    items.map((item) => mapGridItem(item, imageSizes)),
  );

  return mapped.filter((item): item is GridBlockItemConfig => item !== null);
}

export async function mapGridBlock(
  block: CmsGridBlock,
): Promise<GridBlockProps> {
  const heading = mapSectionHeading(block.heading);

  const cols = (block.cols ?? 3) as GridBlockProps["cols"];
  const desktopCols = typeof cols === "number" ? cols : 3;
  const itemSize =
    desktopCols <= 1 ? "100vw" : desktopCols === 2 ? "50vw" : "33vw";
  const imageSizes = `(max-width: 767px) 100vw, (max-width: 1100px) 50vw, ${itemSize}`;
  const sideDimensions = resolveSanityImageDimensions(block.sideImage);

  return {
    ...heading,

    blockLayout: block.blockLayout ?? "stacked",

    alignment: block.alignment ?? "left",

    gridPosition: block.gridPosition ?? "right",

    cols,

    items: await mapGridItems(block.items, imageSizes),

    grayscaleImages: block.grayscaleImages ?? false,

    imageSrc: resolveSanityImage(block.sideImage, { width: 1200 }),

    imageSrcSet: resolveSanityImageSrcSet(
      block.sideImage,
      SANITY_RESPONSIVE_WIDTHS.standard,
    ),

    imageSizes: "(max-width: 767px) 100vw, 50vw",

    imageWidth: sideDimensions?.width,
    imageHeight: sideDimensions?.height,

    imageAlt: block.sideImage?.alt ?? "",
  };
}
