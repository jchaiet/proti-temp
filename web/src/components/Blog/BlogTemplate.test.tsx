import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CmsBlog } from "@/cms/types";

const mocks = vi.hoisted(() => ({
  heroProps: null as Record<string, unknown> | null,
  blockContext: null as Record<string, unknown> | null,
}));

vi.mock("@/components/BlockRenderer", () => ({
  BlockRenderer: ({ context }: { context: Record<string, unknown> }) => {
    mocks.blockContext = context;

    return <div data-testid="blog-body" />;
  },
}));

vi.mock("./BlogHero", () => ({
  BlogHero: (props: Record<string, unknown>) => {
    mocks.heroProps = props;

    return (
      <header>
        <h1>{props.title as ReactNode}</h1>
        {props.authorName ? (
          props.authorHref ? (
            <a href={props.authorHref as string}>
              {props.authorName as string}
            </a>
          ) : (
            <span>{props.authorName as string}</span>
          )
        ) : null}
      </header>
    );
  },
}));

import { BlogTemplate } from "./BlogTemplate";

function buildBlog(locale = "en-us"): CmsBlog {
  return {
    _id: "blog-1",
    _type: "blog",
    siteId: "site-proti",
    locale,
    title: locale === "es-us" ? "Nutrición básica" : "Nutrition Basics",
    slug: "nutrition-basics",
    publishedAt: "2026-09-01T12:00:00Z",
    lastModifiedAt: "2026-09-30T16:00:00Z",
    reviewedAt: "2026-10-01T15:00:00Z",
    author: {
      _id: "author-1",
      _type: "author",
      siteId: "site-proti",
      slug: "jane-smith",
      name: "Jane Smith",
      availableLocales: ["en-us"],
    },
    reviewer: {
      _id: "author-2",
      _type: "author",
      siteId: "site-proti",
      slug: "alex-rivera",
      name: "Alex Rivera",
      jobTitle: "Medical Reviewer",
      availableLocales: ["en-us", "es-us"],
    },
    sources: [
      {
        title: "Nutrition Reference",
        publisher: "Example Journal",
        publicationDate: "2026-08-15T09:00:00Z",
        url: "https://example.org/reference",
      },
    ],
    sections: [],
  };
}

beforeEach(() => {
  mocks.heroProps = null;
  mocks.blockContext = null;
});

describe("BlogTemplate semantic editorial output", () => {
  it("renders semantic editorial dates, reviewer information, and citations", async () => {
    render(
      await BlogTemplate({
        blog: buildBlog(),
      }),
    );

    const updatedTime = screen.getByText("September 30, 2026");
    const reviewedTime = screen.getByText("October 1, 2026");
    const sourceTime = screen.getByText("August 15, 2026");

    expect(updatedTime.tagName).toBe("TIME");
    expect(updatedTime.getAttribute("datetime")).toBe("2026-09-30T16:00:00Z");

    expect(reviewedTime.tagName).toBe("TIME");
    expect(reviewedTime.getAttribute("datetime")).toBe("2026-10-01T15:00:00Z");

    expect(sourceTime.tagName).toBe("TIME");
    expect(sourceTime.getAttribute("datetime")).toBe("2026-08-15T09:00:00Z");

    expect(
      screen.getByRole("complementary", {
        name: "Article editorial information",
      }),
    ).toBeTruthy();

    expect(
      screen
        .getByRole("link", {
          name: "Alex Rivera",
        })
        .getAttribute("href"),
    ).toBe("/authors/alex-rivera");

    const source = screen.getByRole("link", {
      name: "Nutrition Reference",
    });

    expect(source.closest("cite")).toBeTruthy();
    expect(source.getAttribute("href")).toBe("https://example.org/reference");

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Sources",
      }),
    ).toBeTruthy();
  });

  it("falls back to the default Author profile when a localized Author does not exist", async () => {
    render(
      await BlogTemplate({
        blog: buildBlog("es-us"),
        localePrefix: "/es-us",
      }),
    );

    const heroProps = mocks.heroProps as {
      authorHref?: string;
      bylineLabel?: string;
      publishedDateTime?: string;
    };

    expect(heroProps.authorHref).toBe("/authors/jane-smith");
    expect(heroProps.bylineLabel).toBe("Por");
    expect(heroProps.publishedDateTime).toBe("2026-09-01T12:00:00Z");

    expect(
      screen
        .getByRole("link", {
          name: "Alex Rivera",
        })
        .getAttribute("href"),
    ).toBe("/es-us/authors/alex-rivera");

    expect(screen.getByText("Actualizado:")).toBeTruthy();
    expect(screen.getByText("Revisado por:")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Fuentes",
      }),
    ).toBeTruthy();

    expect(mocks.blockContext).toMatchObject({
      locale: "es-us",
      localePrefix: "/es-us",
    });
  });

  it("preserves current-locale Author links when availability metadata is absent", async () => {
    const blog = buildBlog("es-us");

    if (blog.author) {
      delete blog.author.availableLocales;
    }

    render(
      await BlogTemplate({
        blog,
        localePrefix: "/es-us",
      }),
    );

    const heroProps = mocks.heroProps as {
      authorHref?: string;
    };

    expect(heroProps.authorHref).toBe("/es-us/authors/jane-smith");
  });
});
