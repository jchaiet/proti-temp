import type { ContentBlockProps } from "mino-ui/blocks/ContentBlock";

import type { CmsContentBlock } from "@/cms/types";

import { mapCtaGroup } from "@/cms/mappers/cta-group";
import { mapSectionHeading } from "@/cms/mappers/section-heading";
import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";
import { SANITY_RESPONSIVE_WIDTHS } from "@/cms/resolvers/image-widths";

const IMAGE_DISPLAY_WIDTH: Record<
  NonNullable<CmsContentBlock["imageSize"]>,
  number
> = {
  sm: 160,
  md: 240,
  lg: 360,
  full: 800,
};

function resolveContentImage(block: CmsContentBlock): string | undefined {
  if (block.mediaType !== "image") {
    return undefined;
  }

  const imageSize = block.imageSize ?? "full";
  const displayWidth = IMAGE_DISPLAY_WIDTH[imageSize];

  /*
   * Generate approximately 2x the CSS display size for high-DPI screens.
   */
  const width = displayWidth * 2;

  /*
   * Circle is rendered 1:1, so request a square crop from Sanity.
   * This makes the Studio hotspot affect which area stays visible.
   *
   * Non-circle images only request a width. Passing the complete
   * image object still preserves the editor's explicit crop.
   */
  const height = block.imageShape === "circle" ? width : undefined;

  return resolveSanityImage(block.image, {
    width,
    height,
  });
}

export async function mapContentBlock(
  block: CmsContentBlock,
): Promise<ContentBlockProps> {
  const ctaGroup = await mapCtaGroup(block.ctaGroup, {
    legacyItems: block.ctas,
    legacyAlignment: block.ctaAlignment,
    legacyStackOnMobile: block.ctaStackOnMobile,
    fallbackAlignment: block.alignment ?? "left",
  });

  const heading = mapSectionHeading(block.heading);

  const layout = block.layout ?? "default";

  const imageSrc = resolveContentImage(block);
  const imageDimensions = imageSrc
    ? resolveSanityImageDimensions(
        block.image,
        block.imageShape === "circle" ? { aspectRatio: 1 } : {},
      )
    : undefined;
  const imageSize = block.imageSize ?? "full";
  const maxImageWidth = IMAGE_DISPLAY_WIDTH[imageSize];
  const imageSrcSet =
    block.mediaType === "image"
      ? resolveSanityImageSrcSet(
          block.image,
          SANITY_RESPONSIVE_WIDTHS.content.filter(
            (width) => width <= maxImageWidth * 2,
          ),
          block.imageShape === "circle" ? { aspectRatio: 1 } : {},
        )
      : undefined;
  const imageSizes =
    imageSize === "full"
      ? "(max-width: 767px) 100vw, (max-width: 1100px) 80vw, 800px"
      : `${maxImageWidth}px`;

  const videoSrc = block.mediaType === "video" ? block.videoUrl : undefined;

  const mediaPosition =
    layout === "default"
      ? (block.defaultMediaPosition ?? "below")
      : (block.splitMediaPosition ?? "right");

  return {
    ...heading,

    headingProps: {
      level: block.headingLevel ?? 2,

      size: block.headingSize ?? "2xl",
    },

    layout,

    alignment: block.alignment ?? "left",

    vAlignment: block.vAlignment ?? "center",

    mediaPosition,

    imageSrc,

    imageSrcSet,

    imageSizes: imageSrc ? imageSizes : undefined,

    imageWidth: imageDimensions?.width,
    imageHeight: imageDimensions?.height,

    imageAlt: block.image?.alt ?? "",

    imageShape: block.imageShape ?? "rounded",

    imageSize: block.imageSize ?? "full",

    videoSrc,

    ctas: ctaGroup.ctas,

    ctaGroupProps: ctaGroup.ctaGroupProps,
  };
}
