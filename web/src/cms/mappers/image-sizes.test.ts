import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CmsHeroBlock,
  CmsGridBlock,
  CmsCarouselBlock,
  CmsArticleCard,
  CmsResourceCard,
  CmsFullBleedCard,
  CmsTestimonialCard,
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
    () =>
      "https://cdn.example.test/image?w=480 480w, https://cdn.example.test/image?w=1920 1920w",
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

import { mapHeroBlock } from "./blocks/hero";
import { mapGridBlock } from "./blocks/grid";
import { mapCarouselBlock } from "./blocks/carousel";
import { mapArticleCard } from "./cards/article";
import { mapResourceCard } from "./cards/resource";
import { mapFullBleedCard } from "./cards/fullBleed";
import { mapTestimonialCard } from "./cards/testimonial";

const image = {
  _type: "image" as const,
  asset: { _ref: "image-test-1600x900-png", _type: "reference" as const },
  crop: { top: 0.1, bottom: 0, left: 0.05, right: 0 },
  hotspot: { x: 0.4, y: 0.5, width: 0.8, height: 0.8 },
  alt: "Example image",
};

function asCms<T>(value: Record<string, unknown>): T {
  return value as unknown as T;
}

beforeEach(() => {
  mocks.resolveSanityImage.mockClear();
  mocks.resolveLink.mockClear();
  mocks.mapCtaGroup.mockClear();
  mocks.mapSectionHeading.mockClear();
});

describe("CMS image request sizes", () => {
  it("requests a 1920px hero without discarding crop and hotspot", async () => {
    const result = await mapHeroBlock(
      asCms<CmsHeroBlock>({ mediaType: "image", image }),
    );
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 1920,
    });
    expect(mocks.resolveSanityImageSrcSet).toHaveBeenCalledWith(image);
    expect(result.imageSrcSet).toContain("480w");
    expect(result.imageSizes).toContain("100vw");
  });

  it("requests 1200px grid item and side images", async () => {
    await mapGridBlock(
      asCms<CmsGridBlock>({
        sideImage: image,
        items: [{ _key: "one", _type: "gridImageItem", image }],
      }),
    );
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 1200,
    });
    expect(mocks.resolveSanityImage).toHaveBeenCalledTimes(2);
  });

  it("requests 1200px carousel images", async () => {
    await mapCarouselBlock(
      asCms<CmsCarouselBlock>({
        items: [{ _key: "one", _type: "carouselImageItem", image }],
      }),
    );
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 1200,
    });
    expect(mocks.resolveSanityImageDimensions).toHaveBeenCalledWith(image);
  });

  it("requests 960px article images and 240px author avatars", async () => {
    await mapArticleCard(
      asCms<CmsArticleCard>({
        title: "Article",
        image,
        author: { name: "Author", avatar: image },
      }),
    );
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 960,
    });
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 240,
    });
  });

  it("requests 960px resource images", async () => {
    await mapResourceCard(asCms<CmsResourceCard>({ title: "Resource", image }));
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 960,
    });
  });

  it("requests 1600px full-bleed images", async () => {
    await mapFullBleedCard(asCms<CmsFullBleedCard>({ image }));
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 1600,
    });
  });

  it("requests 240px testimonial avatars and 320px logos", () => {
    mapTestimonialCard(
      asCms<CmsTestimonialCard>({
        quote: "Great",
        author: { name: "Author", avatar: image },
        companyLogo: image,
      }),
    );
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 240,
    });
    expect(mocks.resolveSanityImage).toHaveBeenCalledWith(image, {
      width: 320,
    });
  });

  it("does not invent an image URL when the CMS hero has no image", async () => {
    const result = await mapHeroBlock(
      asCms<CmsHeroBlock>({ mediaType: "video" }),
    );
    expect(result.imageSrc).toBeUndefined();
    expect(result.imageSrcSet).toBeUndefined();
    expect(mocks.resolveSanityImage).not.toHaveBeenCalled();
  });
});
