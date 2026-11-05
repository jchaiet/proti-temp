import type {
  CarouselBlockItemConfig,
  CarouselBlockProps,
} from "mino-ui/blocks/CarouselBlock";

import type { CmsCarouselBlock, CmsCarouselItem } from "@/cms/types";

import { mapCtaGroup } from "@/cms/mappers/cta-group";

import {
  mapArticleCard,
  mapFullBleedCard,
  mapResourceCard,
  mapTestimonialCard,
} from "@/cms/mappers/cards";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";

import { SANITY_RESPONSIVE_WIDTHS } from "@/cms/resolvers/image-widths";

import { resolveLink } from "@/cms/resolvers/link";

async function mapCarouselItem(
  item: CmsCarouselItem,
): Promise<CarouselBlockItemConfig | null> {
  switch (item._type) {
    case "carouselImageItem": {
      const imageSrc = resolveSanityImage(item.image, { width: 1200 });

      if (!imageSrc) {
        return null;
      }

      const imageDimensions = resolveSanityImageDimensions(item.image);
      const resolvedLink = item.link ? await resolveLink(item.link) : undefined;

      return {
        id: item._key,

        type: "image",

        imageSrc,

        imageSrcSet: resolveSanityImageSrcSet(
          item.image,
          SANITY_RESPONSIVE_WIDTHS.standard,
        ),

        imageSizes: "(max-width: 767px) 90vw, (max-width: 1100px) 50vw, 33vw",

        imageWidth: imageDimensions?.width,
        imageHeight: imageDimensions?.height,

        imageAlt: item.image?.alt ?? "",

        href: resolvedLink?.href,

        target: resolvedLink?.target,

        rel: resolvedLink?.rel,
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

async function mapCarouselItems(
  items: CmsCarouselItem[] | undefined,
): Promise<CarouselBlockItemConfig[]> {
  if (!items?.length) {
    return [];
  }

  const mapped = await Promise.all(items.map(mapCarouselItem));

  return mapped.filter(
    (item): item is CarouselBlockItemConfig => item !== null,
  );
}

export async function mapCarouselBlock(
  block: CmsCarouselBlock,
): Promise<CarouselBlockProps> {
  const [ctaGroup, items] = await Promise.all([
    mapCtaGroup(block.ctaGroup, {
      legacyItems: block.ctas,
      legacyAlignment: block.ctaAlignment,
      legacyStackOnMobile: block.ctaStackOnMobile,
      fallbackAlignment: block.alignment ?? "left",
    }),

    mapCarouselItems(block.items),
  ]);

  const heading = mapSectionHeading(block.heading);

  return {
    ...heading,

    layout: block.layout ?? "default",

    alignment: block.alignment ?? "left",

    mediaPosition: block.mediaPosition ?? "right",

    ctas: ctaGroup.ctas,

    ctaGroupProps: ctaGroup.ctaGroupProps,

    items,

    carouselProps: {
      itemsPerPage: block.itemsPerPage ?? 3,

      itemsPerRow: block.itemsPerRow,

      autoPlay: block.autoPlay ?? false,

      autoPlayInterval: block.autoPlayInterval ?? 4000,

      mobilePeek: block.mobilePeek ?? true,

      grayscaleImages: block.grayscaleImages ?? false,
    },
  };
}
