import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CmsAuthorPage } from "@/cms/types/author";
import type { CmsBlog, ResolvedRedirect } from "@/cms/types";
import type { GetAuthorPageOptions } from "@/cms/resolvers/author";
import type {
  BlogTaxonomyPage,
  GetBlogTaxonomyPageOptions,
} from "@/cms/resolvers/blog-taxonomy";
import type { GetBlogBySlugOptions } from "@/cms/resolvers/blog";
import type { ResolveRedirectOptions } from "@/cms/resolvers/redirect";
import type { ResolvedPage } from "@/sanity/queries/page";

const mocks = vi.hoisted(() => ({
  resolveRedirect:
    vi.fn<
      (options: ResolveRedirectOptions) => Promise<ResolvedRedirect | null>
    >(),
  getAuthorPage:
    vi.fn<(options: GetAuthorPageOptions) => Promise<CmsAuthorPage | null>>(),
  getBlogTaxonomyPage:
    vi.fn<
      (options: GetBlogTaxonomyPageOptions) => Promise<BlogTaxonomyPage | null>
    >(),
  getBlogBySlug:
    vi.fn<(options: GetBlogBySlugOptions) => Promise<CmsBlog | null>>(),
  resolvePageBySegments:
    vi.fn<
      (
        siteId: string,
        locale: string,
        segments: string[],
      ) => Promise<ResolvedPage | null>
    >(),
}));

vi.mock("@/cms/resolvers/redirect", () => ({
  resolveRedirect: mocks.resolveRedirect,
}));

vi.mock("@/cms/resolvers/author", () => ({
  getAuthorPage: mocks.getAuthorPage,
}));

vi.mock("@/cms/resolvers/blog-taxonomy", () => ({
  getBlogTaxonomyPage: mocks.getBlogTaxonomyPage,
}));

vi.mock("@/cms/resolvers/blog", () => ({
  getBlogBySlug: mocks.getBlogBySlug,
}));

vi.mock("@/sanity/queries/page", () => ({
  resolvePageBySegments: mocks.resolvePageBySegments,
}));

import {
  getAuthorSlug,
  getBlogSlug,
  getBlogTaxonomySegments,
  resolveRoute,
} from "./route";

beforeEach(() => {
  mocks.resolveRedirect.mockReset().mockResolvedValue(null);
  mocks.getAuthorPage.mockReset().mockResolvedValue(null);
  mocks.getBlogTaxonomyPage.mockReset().mockResolvedValue(null);
  mocks.getBlogBySlug.mockReset().mockResolvedValue(null);
  mocks.resolvePageBySegments.mockReset().mockResolvedValue(null);
});

describe("route shape helpers", () => {
  it("recognizes reserved content route shapes", () => {
    expect(getAuthorSlug(["authors", "jane-doe"])).toBe("jane-doe");
    expect(getAuthorSlug(["authors"])).toBeNull();

    expect(getBlogSlug(["blog", "article"])).toBe("article");
    expect(getBlogSlug(["blog", "category", "article"])).toBeNull();

    expect(getBlogTaxonomySegments(["blog", "conditions", "diabetes"])).toEqual(
      ["conditions", "diabetes"],
    );
    expect(getBlogTaxonomySegments(["blog", "article"])).toBeNull();
  });
});

describe("resolveRoute", () => {
  it("requires Site and Locale identity", async () => {
    await expect(
      resolveRoute({
        siteId: "",
        locale: "en-us",
        segments: [],
      }),
    ).resolves.toEqual({ type: "notFound" });

    expect(mocks.resolveRedirect).not.toHaveBeenCalled();
  });

  it("gives CMS Redirects highest precedence", async () => {
    mocks.resolveRedirect.mockResolvedValueOnce({
      destination: "/new",
      permanent: true,
      preserveQuery: true,
    });

    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: ["search"],
      }),
    ).resolves.toEqual({
      type: "redirect",
      redirect: {
        destination: "/new",
        permanent: true,
        preserveQuery: true,
      },
    });

    expect(mocks.getAuthorPage).not.toHaveBeenCalled();
    expect(mocks.getBlogTaxonomyPage).not.toHaveBeenCalled();
    expect(mocks.getBlogBySlug).not.toHaveBeenCalled();
    expect(mocks.resolvePageBySegments).not.toHaveBeenCalled();
  });

  it("canonicalizes an explicitly-prefixed default Locale after Redirect lookup", async () => {
    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: ["products", "widget"],
        explicitDefaultLocale: true,
      }),
    ).resolves.toEqual({
      type: "canonicalRedirect",
      destination: "/products/widget",
    });

    expect(mocks.resolveRedirect).toHaveBeenCalledWith({
      siteId: "site-a",
      locale: "en-us",
      sourcePath: "/products/widget",
      localePrefix: "",
    });
    expect(mocks.resolvePageBySegments).not.toHaveBeenCalled();
  });

  it("resolves /search exactly like any other authored Page", async () => {
    const searchPage = {
      _id: "page-search",
      title: "Search",
      locale: "en-us",
    } as ResolvedPage;

    mocks.resolvePageBySegments.mockResolvedValueOnce(searchPage);

    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: ["search"],
      }),
    ).resolves.toEqual({
      type: "page",
      page: searchPage,
    });

    expect(mocks.resolvePageBySegments).toHaveBeenCalledWith(
      "site-a",
      "en-us",
      ["search"],
    );
  });

  it("returns notFound when the authored /search Page does not exist", async () => {
    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: ["search"],
      }),
    ).resolves.toEqual({ type: "notFound" });

    expect(mocks.resolvePageBySegments).toHaveBeenCalledWith(
      "site-a",
      "en-us",
      ["search"],
    );
  });

  it("resolves Author routes within the requested Site and Locale", async () => {
    const authorPage = {
      locale: "es-us",
      author: {
        _id: "author-1",
        _type: "author" as const,
        siteId: "site-a",
        slug: "jane-doe",
        name: "Jane Doe",
      },
      articles: [],
    };

    mocks.getAuthorPage.mockResolvedValueOnce(authorPage);

    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "es-us",
        segments: ["authors", "jane-doe"],
        localePrefix: "/es-us",
      }),
    ).resolves.toEqual({
      type: "author",
      authorPage,
    });

    expect(mocks.getAuthorPage).toHaveBeenCalledWith({
      siteId: "site-a",
      locale: "es-us",
      slug: "jane-doe",
    });
    expect(mocks.resolveRedirect).toHaveBeenCalledWith({
      siteId: "site-a",
      locale: "es-us",
      sourcePath: "/authors/jane-doe",
      localePrefix: "/es-us",
    });
    expect(mocks.resolvePageBySegments).not.toHaveBeenCalled();
  });

  it("fails closed for a missing Author instead of falling through to Page", async () => {
    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: ["authors", "missing"],
      }),
    ).resolves.toEqual({ type: "notFound" });

    expect(mocks.resolvePageBySegments).not.toHaveBeenCalled();
  });

  it("resolves Site-scoped Taxonomy using the request Locale for translated content", async () => {
    const taxonomyPage = {
      taxonomy: {
        _id: "taxonomy-1",
        title: "Nutrición",
        slug: "nutrition",
        path: "conditions/nutrition",
      },
      blogs: [],
    };

    mocks.getBlogTaxonomyPage.mockResolvedValueOnce(taxonomyPage);

    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "es-us",
        segments: ["blog", "conditions", "nutrition"],
      }),
    ).resolves.toEqual({
      type: "taxonomy",
      taxonomyPage,
    });

    expect(mocks.getBlogTaxonomyPage).toHaveBeenCalledWith({
      siteId: "site-a",
      locale: "es-us",
      segments: ["conditions", "nutrition"],
    });
    expect(mocks.getBlogBySlug).not.toHaveBeenCalled();
    expect(mocks.resolvePageBySegments).not.toHaveBeenCalled();
  });

  it("fails closed for a missing Taxonomy route instead of falling through to Page", async () => {
    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: ["blog", "conditions", "missing"],
      }),
    ).resolves.toEqual({ type: "notFound" });

    expect(mocks.resolvePageBySegments).not.toHaveBeenCalled();
  });

  it("resolves Blog detail routes within the requested Site and Locale", async () => {
    const blog = {
      _id: "blog-1",
      _type: "blog" as const,
      siteId: "site-a",
      locale: "es-us",
      title: "Artículo",
      slug: "article",
    };

    mocks.getBlogBySlug.mockResolvedValueOnce(blog);

    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "es-us",
        segments: ["blog", "article"],
      }),
    ).resolves.toEqual({
      type: "blog",
      blog,
    });

    expect(mocks.getBlogBySlug).toHaveBeenCalledWith({
      siteId: "site-a",
      locale: "es-us",
      slug: "article",
    });
    expect(mocks.resolvePageBySegments).not.toHaveBeenCalled();
  });

  it("keeps /blog/<slug> owned by Blog detail rather than root Taxonomy", async () => {
    const blog = {
      _id: "blog-topics",
      _type: "blog" as const,
      siteId: "site-a",
      locale: "en-us",
      title: "Topics",
      slug: "topics",
    };

    mocks.getBlogBySlug.mockResolvedValueOnce(blog);

    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: ["blog", "topics"],
      }),
    ).resolves.toEqual({
      type: "blog",
      blog,
    });

    expect(mocks.getBlogTaxonomyPage).not.toHaveBeenCalled();
  });

  it("fails closed for a missing Blog instead of falling through to Page", async () => {
    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: ["blog", "missing"],
      }),
    ).resolves.toEqual({ type: "notFound" });

    expect(mocks.resolvePageBySegments).not.toHaveBeenCalled();
  });

  it("delegates homepage and nested Page paths with Site and Locale identity", async () => {
    const homepage = {
      _id: "home",
      title: "Home",
      locale: "en-us",
      isHomepage: true,
      sections: [],
    };

    mocks.resolvePageBySegments.mockResolvedValueOnce(homepage);

    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: [],
      }),
    ).resolves.toEqual({
      type: "page",
      page: homepage,
    });

    expect(mocks.resolvePageBySegments).toHaveBeenLastCalledWith(
      "site-a",
      "en-us",
      [],
    );

    const nestedPage = {
      _id: "widget",
      title: "Widget",
      locale: "es-us",
      slug: "widget",
      sections: [],
    };

    mocks.resolvePageBySegments.mockResolvedValueOnce(nestedPage);

    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "es-us",
        segments: ["products", "widget"],
      }),
    ).resolves.toEqual({
      type: "page",
      page: nestedPage,
    });

    expect(mocks.resolvePageBySegments).toHaveBeenLastCalledWith(
      "site-a",
      "es-us",
      ["products", "widget"],
    );
  });

  it("returns notFound when no route claims the path", async () => {
    await expect(
      resolveRoute({
        siteId: "site-a",
        locale: "en-us",
        segments: ["does-not-exist"],
      }),
    ).resolves.toEqual({ type: "notFound" });
  });
});
