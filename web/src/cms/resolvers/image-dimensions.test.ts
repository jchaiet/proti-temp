import { describe, expect, it, vi } from "vitest";

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    config: () => ({ projectId: "test", dataset: "production" }),
  },
}));

import { resolveSanityImageDimensions } from "./image";

const image = {
  asset: { _type: "reference" as const, _ref: "image-abc123-1300x865-webp" },
};

describe("Sanity intrinsic image dimensions", () => {
  it("uses source asset dimensions without a crop", () => {
    expect(resolveSanityImageDimensions(image)).toEqual({
      width: 1300,
      height: 865,
    });
  });

  it("accounts for author-selected crop percentages", () => {
    expect(
      resolveSanityImageDimensions({
        ...image,
        crop: { left: 0.1, right: 0.2, top: 0.1, bottom: 0.1 },
      }),
    ).toEqual({ width: 910, height: 692 });
  });

  it("reserves a square for a circle image", () => {
    expect(resolveSanityImageDimensions(image, { aspectRatio: 1 })).toEqual({
      width: 1300,
      height: 1300,
    });
  });

  it("returns undefined for unknown references or invalid crop", () => {
    expect(resolveSanityImageDimensions(undefined)).toBeUndefined();
    expect(
      resolveSanityImageDimensions({
        asset: { _ref: "not-a-known-sanity-ref" },
      }),
    ).toBeUndefined();
    expect(
      resolveSanityImageDimensions({
        ...image,
        crop: { left: 0.8, right: 0.3 },
      }),
    ).toBeUndefined();
  });
});
