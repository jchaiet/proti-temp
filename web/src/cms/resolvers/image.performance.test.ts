import { describe, expect, it, vi } from "vitest";

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    config: () => ({ projectId: "test", dataset: "production" }),
  },
}));

// This test is source focused: it checks that responsive sizes never upscale
// a known Sanity asset while leaving editor crop/hotspot on the image object.
import { resolveSanityImageSrcSet } from "./image";
import { SANITY_RESPONSIVE_WIDTHS } from "./image-widths";

const demo = {
  _type: "image" as const,
  asset: { _type: "reference" as const, _ref: "image-abc123-1300x865-webp" },
  crop: { top: 0.1, bottom: 0.1, left: 0.05, right: 0 },
  hotspot: { x: 0.4, y: 0.5, width: 0.8, height: 0.8 },
};

describe("Sanity image srcset sizing", () => {
  it("avoids upscaling a 1300px source in 1600/1920px candidates", () => {
    const srcSet = resolveSanityImageSrcSet(demo);
    expect(srcSet).toContain("480w");
    expect(srcSet).toContain("1280w");
    expect(srcSet).not.toContain("1600w");
    expect(srcSet).not.toContain("1920w");
    expect(srcSet).toContain("1300x865");
  });
  it("reuses the exact 768px CDN URL across Hero and Content image candidates", () => {
    const heroSrcSet = resolveSanityImageSrcSet(demo);
    const contentSrcSet = resolveSanityImageSrcSet(
      demo,
      SANITY_RESPONSIVE_WIDTHS.content,
    );

    const candidate = (srcSet: string | undefined, width: number) =>
      srcSet
        ?.split(", ")
        .find((entry) => entry.endsWith(` ${width}w`))
        ?.slice(0, -` ${width}w`.length);

    const hero768 = candidate(heroSrcSet, 768);
    const content768 = candidate(contentSrcSet, 768);

    expect(hero768).toBeDefined();
    expect(content768).toBe(hero768);
    expect(hero768).toContain("1300x865");
    expect(heroSrcSet).not.toContain(" 800w");
    expect(contentSrcSet).not.toContain(" 800w");
  });

  it("emits a candidate for sources smaller than all requested widths", () => {
    const tiny = {
      ...demo,
      asset: { ...demo.asset, _ref: "image-tiny-180x120-webp" },
    };
    expect(resolveSanityImageSrcSet(tiny, [320, 640])).toContain("180w");
  });
});
