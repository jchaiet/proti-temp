import { beforeEach, describe, expect, it, vi } from "vitest";

const { sanityFetchMock } = vi.hoisted(() => ({
  sanityFetchMock: vi.fn<
    (
      query: string,
      params?: Record<string, unknown>,
      options?: {
        visualEditing?: boolean;
        perspective?: "published" | "drafts" | "raw";
      },
    ) => Promise<unknown>
  >(),
}));

vi.mock("@/sanity/fetch", () => ({
  sanityFetch: sanityFetchMock,
}));

vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImagePreset: vi.fn(() => undefined),
}));

import { getBlogTaxonomyPage } from "./blog-taxonomy";

beforeEach(() => {
  sanityFetchMock.mockReset();
});

describe("getBlogTaxonomyPage", () => {
  it("resolves shared Taxonomy by Site while using Locale for translated content", async () => {
    sanityFetchMock
      .mockResolvedValueOnce([
        {
          _id: "taxonomy-topics",
          title: "Temas",
          slug: "topics",
        },
        {
          _id: "taxonomy-nutrition",
          title: "Nutrición",
          slug: "nutrition",
          parentId: "taxonomy-topics",
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(
      getBlogTaxonomyPage({
        siteId: "site-a",
        locale: "es-us",
        segments: ["topics", "nutrition"],
        visualEditing: true,
      }),
    ).resolves.toEqual({
      taxonomy: {
        _id: "taxonomy-nutrition",
        title: "Nutrición",
        slug: "nutrition",
        parentId: "taxonomy-topics",
        path: "topics/nutrition",
      },
      blogs: [],
    });

    const taxonomyFetch = sanityFetchMock.mock.calls[0];
    const blogFetch = sanityFetchMock.mock.calls[1];

    expect(taxonomyFetch?.[0] ?? "").toMatch(
      /_type == "taxonomy" &&\s*site\._ref == \$siteId\s*\]/,
    );
    expect(taxonomyFetch?.[1]).toEqual({
      siteId: "site-a",
      locale: "es-us",
    });
    expect(taxonomyFetch?.[2]?.visualEditing).toBe(true);
    expect(blogFetch?.[2]?.visualEditing).toBe(true);
  });

  it("threads visualEditing=false through metadata-safe Taxonomy fetches", async () => {
    sanityFetchMock
      .mockResolvedValueOnce([
        {
          _id: "taxonomy-topics",
          title: "Topics",
          slug: "topics",
        },
        {
          _id: "taxonomy-nutrition",
          title: "Nutrition",
          slug: "nutrition",
          parentId: "taxonomy-topics",
        },
      ])
      .mockResolvedValueOnce([]);

    await getBlogTaxonomyPage({
      siteId: "site-a",
      locale: "en-us",
      segments: ["topics", "nutrition"],
      visualEditing: false,
    });

    expect(sanityFetchMock.mock.calls[0]?.[2]?.visualEditing).toBe(false);
    expect(sanityFetchMock.mock.calls[1]?.[2]?.visualEditing).toBe(false);
  });

  it("returns null when the complete nested Taxonomy path does not exist", async () => {
    sanityFetchMock.mockResolvedValueOnce([
      {
        _id: "taxonomy-topics",
        title: "Topics",
        slug: "topics",
      },
    ]);

    await expect(
      getBlogTaxonomyPage({
        siteId: "site-a",
        locale: "en-us",
        segments: ["topics", "missing"],
        visualEditing: true,
      }),
    ).resolves.toBeNull();

    expect(sanityFetchMock).toHaveBeenCalledTimes(1);
  });
});
