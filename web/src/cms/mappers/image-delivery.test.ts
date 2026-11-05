import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CmsTabsBlock,
  CmsFormBlock,
  CmsContentBlock,
  CmsGridBlock,
  CmsArticleCard,
  CmsResourceCard,
  CmsFullBleedCard,
  CmsCarouselBlock,
} from "@/cms/types";

const mocks = vi.hoisted(() => ({
  resolveSanityImage: vi.fn((_image: unknown, options?: { width?: number }) =>
    options?.width
      ? `https://cdn.example.test/image?w=${options.width}`
      : undefined,
  ),
  resolveSanityImageDimensions: vi.fn(
    (
      image: { asset?: { _ref?: string } } | null | undefined,
      options?: { aspectRatio?: number },
    ) => {
      if (!image?.asset?._ref) return undefined;
      const width = 1000;
      return {
        width,
        height: options?.aspectRatio
          ? Math.round(width / options.aspectRatio)
          : 750,
      };
    },
  ),
  resolveSanityImageSrcSet: vi.fn(
    () => "https://cdn.example.test/image?w=480 480w",
  ),
  resolveLink: vi.fn(async () => undefined),
  mapCtaGroup: vi.fn(async () => ({ ctas: [], ctaGroupProps: undefined })),
  mapSectionHeading: vi.fn(() => ({})),
}));
vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImage: mocks.resolveSanityImage,
  resolveSanityImageSrcSet: mocks.resolveSanityImageSrcSet,
  resolveSanityImageDimensions: mocks.resolveSanityImageDimensions,
}));
vi.mock("@/cms/resolvers/link", () => ({ resolveLink: mocks.resolveLink }));
vi.mock("@/cms/mappers/cta-group", () => ({ mapCtaGroup: mocks.mapCtaGroup }));
vi.mock("@/cms/mappers/section-heading", () => ({
  mapSectionHeading: mocks.mapSectionHeading,
}));
vi.mock("@/components/CmsRichText", () => ({ CmsRichText: () => null }));

import { mapTabsBlock } from "./blocks/tabs";
import { mapFormBlock } from "./blocks/form";
import { mapContentBlock } from "./blocks/content";
import { mapGridBlock } from "./blocks/grid";
import { mapCarouselBlock } from "./blocks/carousel";
import { mapArticleCard } from "./cards/article";
import { mapResourceCard } from "./cards/resource";
import { mapFullBleedCard } from "./cards/fullBleed";

const image = {
  _type: "image" as const,
  asset: { _ref: "image-demo-1300x865-webp", _type: "reference" as const },
  crop: { top: 0.15, bottom: 0.05, left: 0.1, right: 0 },
  hotspot: { x: 0.45, y: 0.5, width: 0.8, height: 0.8 },
  alt: "City",
};
function asCms<T>(value: Record<string, unknown>): T {
  return value as unknown as T;
}

beforeEach(() => {
  mocks.resolveSanityImage.mockClear();
  mocks.resolveSanityImageSrcSet.mockClear();
});

describe("responsive image requests from CMS", () => {
  it("bounds Tabs and Form image URLs and emits responsive candidates", async () => {
    const tabs = await mapTabsBlock(
      asCms<CmsTabsBlock>({
        items: [{ _key: "one", label: "One", mediaType: "image", image }],
      }),
    );
    expect(tabs.items?.[0].imageSrc).toContain("w=1200");
    expect(tabs.items?.[0].imageSrcSet).toContain("480w");
    expect(mocks.resolveSanityImageSrcSet).toHaveBeenCalledWith(
      image,
      [320, 480, 640, 768, 960, 1200],
    );
    const form = mapFormBlock(asCms<CmsFormBlock>({ _key: "f", image }));
    expect(form.imageSrc).toContain("w=1200");
    expect(form.imageSrcSet).toContain("480w");
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 1200,
    });
  });

  it("uses the shared 768px candidate for full-width Content images", async () => {
    const content = await mapContentBlock(
      asCms<CmsContentBlock>({ mediaType: "image", image, imageSize: "full" }),
    );
    expect(content.imageSizes).toBe(
      "(max-width: 767px) 100vw, (max-width: 1100px) 80vw, 800px",
    );
    expect(mocks.resolveSanityImageSrcSet).toHaveBeenCalledWith(
      image,
      [160, 240, 320, 480, 640, 768, 960, 1200, 1600],
      {},
    );
  });

  it("retains a square hotspot crop for circular Content images", async () => {
    const content = await mapContentBlock(
      asCms<CmsContentBlock>({
        mediaType: "image",
        image,
        imageSize: "sm",
        imageShape: "circle",
      }),
    );
    expect(content.imageSrc).toContain("w=320");
    expect(content.imageSizes).toBe("160px");
    expect(mocks.resolveSanityImageSrcSet).toHaveBeenCalledWith(
      image,
      [160, 240, 320],
      { aspectRatio: 1 },
    );
  });

  it("sizes Grid items by columns and supplies side-media srcSet", async () => {
    const grid = await mapGridBlock(
      asCms<CmsGridBlock>({
        cols: 2,
        sideImage: image,
        items: [{ _key: "g", _type: "gridImageItem", image }],
      }),
    );
    expect(mocks.resolveSanityImageSrcSet).toHaveBeenCalledWith(
      image,
      [320, 480, 640, 768, 960, 1200],
    );
    expect(grid.items?.[0].imageSizes).toContain("50vw");
    expect(grid.items?.[0].imageSrcSet).toContain("480w");
    expect(grid.imageSrcSet).toContain("480w");
    expect(grid.imageWidth).toBe(1000);
    expect(grid.imageHeight).toBe(750);
    expect(grid.items?.[0].imageWidth).toBe(1000);
    expect(grid.items?.[0].imageHeight).toBe(750);
  });

  it("passes responsive sources to Carousel image items", async () => {
    const carousel = await mapCarouselBlock(
      asCms<CmsCarouselBlock>({
        items: [{ _key: "c", _type: "carouselImageItem", image }],
      }),
    );
    expect(mocks.resolveSanityImageSrcSet).toHaveBeenCalledWith(
      image,
      [320, 480, 640, 768, 960, 1200],
    );
    expect(carousel.items?.[0].imageSrcSet).toContain("480w");
    expect(carousel.items?.[0].imageSizes).toContain("90vw");
    expect(carousel.items?.[0].imageWidth).toBe(1000);
    expect(carousel.items?.[0].imageHeight).toBe(750);
    expect(mocks.resolveSanityImageDimensions).toHaveBeenCalledWith(image);
  });

  it("adds image srcSet to the three card families", async () => {
    const article = await mapArticleCard(
      asCms<CmsArticleCard>({ title: "Article", image }),
    );
    const resource = await mapResourceCard(
      asCms<CmsResourceCard>({ title: "Resource", image }),
    );
    const fullBleed = await mapFullBleedCard(
      asCms<CmsFullBleedCard>({ title: "Full", image }),
    );
    expect(article.imageSrcSet).toContain("480w");
    expect(resource.imageSrcSet).toContain("480w");
    expect(fullBleed?.imageSrcSet).toContain("480w");
  });
});
