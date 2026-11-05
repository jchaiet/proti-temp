import { createImageUrlBuilder } from "@sanity/image-url";

import type { CmsImage } from "@/cms/types";

import { SANITY_RESPONSIVE_WIDTHS } from "./image-widths";

import { sanityClient } from "@/sanity/client";

const imageBuilder = createImageUrlBuilder(sanityClient);

export interface ResolveSanityImageOptions {
  width?: number;

  height?: number;

  quality?: number;
}

export type SanityImagePreset =
  | "avatar"
  | "card"
  | "content"
  | "hero"
  | "logo"
  | "social";

const IMAGE_PRESETS: Record<SanityImagePreset, ResolveSanityImageOptions> = {
  avatar: {
    width: 480,
    height: 480,
    quality: 90,
  },

  card: {
    width: 960,
    height: 540,
    quality: 85,
  },

  content: {
    width: 1600,
    quality: 85,
  },

  hero: {
    width: 1600,
    height: 900,
    quality: 88,
  },

  logo: {
    width: 512,
    quality: 90,
  },

  social: {
    width: 1200,
    height: 630,
    quality: 90,
  },
};

/**
 * Read intrinsic dimensions from the Sanity asset reference, accounting for
 * editor-authored crop percentages. These attributes let the browser reserve
 * image layout space before loading; they do not control responsive selection.
 *
 * An explicit aspectRatio should be used when the image URL builder generates
 * a different aspect ratio (for example, circle/1:1 crops).
 */
export function resolveSanityImageDimensions(
  image: CmsImage | null | undefined,
  options: { aspectRatio?: number } = {},
): { width: number; height: number } | undefined {
  const ref = image?.asset?._ref;
  if (!ref) return undefined;

  const match = /-(\d+)x(\d+)-[a-z0-9]+$/i.exec(ref);
  if (!match) return undefined;

  const sourceWidth = Number(match[1]);
  const sourceHeight = Number(match[2]);
  if (
    !Number.isSafeInteger(sourceWidth) ||
    !Number.isSafeInteger(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return undefined;
  }

  const crop = image?.crop;
  const left = crop?.left ?? 0;
  const right = crop?.right ?? 0;
  const top = crop?.top ?? 0;
  const bottom = crop?.bottom ?? 0;

  if (
    [left, right, top, bottom].some(
      (fraction) => !Number.isFinite(fraction) || fraction < 0 || fraction >= 1,
    ) ||
    left + right >= 1 ||
    top + bottom >= 1
  ) {
    return undefined;
  }

  const width = Math.max(1, Math.round(sourceWidth * (1 - left - right)));
  const height = Math.max(1, Math.round(sourceHeight * (1 - top - bottom)));

  if (options.aspectRatio !== undefined) {
    const ratio = options.aspectRatio;
    if (!Number.isFinite(ratio) || ratio <= 0) return undefined;
    return { width, height: Math.max(1, Math.round(width / ratio)) };
  }

  return { width, height };
}

export function resolveSanityImage(
  image: CmsImage | null | undefined,

  options: ResolveSanityImageOptions = {},
): string | undefined {
  if (!image?.asset?._ref) {
    return undefined;
  }

  /*
   * The complete Sanity image object is intentionally
   * passed to the URL builder.
   *
   * Passing only asset._ref or asset->url discards
   * the editor-authored crop/hotspot intent.
   */
  let builder = imageBuilder
    .image(image)
    .auto("format")
    .quality(options.quality ?? 85);

  if (options.width) {
    builder = builder.width(options.width);
  }

  if (options.height) {
    builder = builder.height(options.height);
  }

  /*
   * Both dimensions define a target aspect ratio.
   * Sanity can then use the hotspot as the focal area
   * for the generated crop.
   */
  if (options.width && options.height) {
    builder = builder.fit("crop");
  }

  return builder.url();
}

/**
 * Responsive sources use the same complete Sanity image object as the fallback.
 * This preserves editor-authored crop and hotspot for every candidate.
 */
export function resolveSanityImageSrcSet(
  image: CmsImage | null | undefined,
  widths: readonly number[] = SANITY_RESPONSIVE_WIDTHS.hero,
  options: { aspectRatio?: number } = {},
): string | undefined {
  if (!image?.asset?._ref) return undefined;

  // Sanity asset references encode the original pixel dimensions.
  // Avoid generating responsive candidates wider than the source asset,
  // which adds bytes without introducing image detail. Unknown references
  // retain the caller-supplied candidates.
  const widthMatch = /-(\d+)x\d+-[a-z0-9]+$/i.exec(image.asset._ref);
  const sourceWidth = widthMatch ? Number(widthMatch[1]) : undefined;

  const boundedWidths =
    sourceWidth && !widths.some((width) => width > 0 && width <= sourceWidth)
      ? [...widths, sourceWidth]
      : widths;

  const candidates = Array.from(new Set(boundedWidths))
    .filter(
      (width) =>
        Number.isSafeInteger(width) &&
        width > 0 &&
        (!sourceWidth || width <= sourceWidth),
    )
    .sort((a, b) => a - b)
    .map((width) => {
      const height =
        options.aspectRatio &&
        Number.isFinite(options.aspectRatio) &&
        options.aspectRatio > 0
          ? Math.round(width / options.aspectRatio)
          : undefined;
      const url = resolveSanityImage(image, {
        width,
        ...(height ? { height } : {}),
      });
      return url ? `${url} ${width}w` : null;
    })
    .filter((value): value is string => value !== null);

  return candidates.length ? candidates.join(", ") : undefined;
}

export function resolveSanityImagePreset(
  image: CmsImage | null | undefined,

  preset: SanityImagePreset,
): string | undefined {
  return resolveSanityImage(image, IMAGE_PRESETS[preset]);
}
