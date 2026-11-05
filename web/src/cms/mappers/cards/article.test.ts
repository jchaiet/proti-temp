import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CmsArticleCard } from "@/cms/types";
import {
  resolveSanityImage,
  resolveSanityImageDimensions,
  resolveSanityImageSrcSet,
} from "@/cms/resolvers/image";

import { mapArticleCard } from "./article";

vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImage: vi.fn(),
  resolveSanityImageDimensions: vi.fn(),
  resolveSanityImageSrcSet: vi.fn(),
}));

vi.mock("@/cms/resolvers/link", () => ({
  resolveLink: vi.fn(),
}));

const card = {
  title: "Test article",
  image: {
    alt: "Example image",
    asset: {
      _type: "reference",
      _ref: "image-a9989fc2c57f31ad12fe5a58b655448ef4636a9e-1300x867-webp",
    },
  },
} as CmsArticleCard;

describe("mapArticleCard image dimensions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveSanityImage).mockReturnValue(
      "https://example.com/image.webp?w=960",
    );
    vi.mocked(resolveSanityImageSrcSet).mockReturnValue(
      "https://example.com/image.webp?w=960 960w",
    );
    vi.mocked(resolveSanityImageDimensions).mockReturnValue({
      width: 1300,
      height: 867,
    });
  });

  it("passes the aspect ratio resolved from Sanity instead of assuming 16:9", async () => {
    const result = await mapArticleCard(card);

    expect(resolveSanityImageDimensions).toHaveBeenCalledWith(card.image);
    expect(result.imageWidth).toBe(1300);
    expect(result.imageHeight).toBe(867);
    expect(result.imageUrl).toBe("https://example.com/image.webp?w=960");
  });

  it("omits dimensions when the asset reference cannot be resolved", async () => {
    vi.mocked(resolveSanityImageDimensions).mockReturnValue(undefined);

    const result = await mapArticleCard(card);

    expect(result.imageWidth).toBeUndefined();
    expect(result.imageHeight).toBeUndefined();
  });

  it("does not try to resolve dimensions when there is no image URL", async () => {
    vi.mocked(resolveSanityImage).mockReturnValue(undefined);

    const result = await mapArticleCard(card);

    expect(result.imageUrl).toBeUndefined();
    expect(result.imageWidth).toBeUndefined();
    expect(result.imageHeight).toBeUndefined();
    expect(resolveSanityImageDimensions).not.toHaveBeenCalled();
  });
});
