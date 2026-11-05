import type { CmsHeroBlock } from "@/cms/types";
import { mapCtaGroup } from "../cta-group";
import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "../../resolvers/image";
import type { HeroProps } from "mino-ui/blocks/HeroBlock";
import { mapSectionHeading } from "../section-heading";

function resolveMediaPosition(block: CmsHeroBlock): HeroProps["mediaPosition"] {
  const layout = block.layout ?? "default";

  if (layout === "default") {
    return block.defaultMediaPosition ?? "below";
  }

  if (layout === "split" || layout === "split-35-65") {
    return block.splitMediaPosition ?? "right";
  }

  return undefined;
}

export async function mapHeroBlock(block: CmsHeroBlock): Promise<HeroProps> {
  const ctaGroup = await mapCtaGroup(block.ctaGroup, {
    legacyItems: block.ctas,
    legacyAlignment: block.ctaAlignment,
    legacyStackOnMobile: block.ctaStackOnMobile,
    fallbackAlignment: block.hAlignment ?? "left",
  });

  const imageSrc =
    block.mediaType === "image"
      ? resolveSanityImage(block.image, { width: 1920 })
      : undefined;

  const imageSrcSet =
    block.mediaType === "image"
      ? resolveSanityImageSrcSet(block.image)
      : undefined;

  const imageDimensions = imageSrc
    ? resolveSanityImageDimensions(block.image)
    : undefined;

  // Keep sizes aligned with the component's responsive layout.
  const imageSizes =
    block.layout === "full-bleed"
      ? "100vw"
      : block.layout === "split" || block.layout === "split-35-65"
        ? "(max-width: 767px) 100vw, (max-width: 1300px) 60vw, 850px"
        : "(max-width: 767px) 100vw, (max-width: 1300px) 90vw, 1200px";

  const videoSrc = block.mediaType === "video" ? block.videoUrl : undefined;

  const heading = mapSectionHeading(block.heading);

  return {
    ...heading,

    title: heading.title ?? "",

    layout: block.layout ?? "default",

    hAlignment: block.hAlignment ?? "left",

    vAlignment: block.vAlignment ?? "center",

    mediaPosition: resolveMediaPosition(block),

    imageSrc,

    imageSrcSet,

    imageSizes: imageSrc ? imageSizes : undefined,

    imageWidth: imageDimensions?.width,

    imageHeight: imageDimensions?.height,

    imageAlt: block.image?.alt ?? "",

    videoSrc,

    ctas: ctaGroup.ctas,

    ctaGroupProps: ctaGroup.ctaGroupProps,
  };
}
