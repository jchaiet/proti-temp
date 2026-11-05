import type { ReactNode } from "react";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { CmsTaxonomyTerm } from "@/cms/types";

const mocks = vi.hoisted(() => ({
  heroProps: null as Record<string, unknown> | null,
}));

vi.mock("mino-ui/blocks/HeroBlock", () => ({
  HeroBlock: (props: Record<string, unknown>) => {
    mocks.heroProps = props;

    return (
      <div data-testid="hero">
        <h1>{props.title as ReactNode}</h1>
        {props.eyebrow as ReactNode}
        <div>{props.byline as ReactNode}</div>
      </div>
    );
  },
}));

import { BlogHero } from "./BlogHero";

function createTaxonomyTerm(title: string, slug: string): CmsTaxonomyTerm {
  return {
    _id: `taxonomy-${slug}`,
    _type: "taxonomy",
    title,
    slug,
  };
}

beforeEach(() => {
  mocks.heroProps = null;
});

describe("BlogHero taxonomy Search links", () => {
  it("renders the Blog title as the page h1", () => {
    render(<BlogHero title="Nutrition article" />);

    const props = mocks.heroProps as {
      headingProps?: {
        level?: number;
      };
    };

    expect(props.headingProps).toMatchObject({
      level: 1,
    });
  });

  it("does not show the Summary in the article hero by default", () => {
    render(<BlogHero title="Nutrition article" summary="Article summary" />);

    const props = mocks.heroProps as {
      description?: string;
    };

    expect(props.description).toBeUndefined();
  });

  it("shows the Summary when article display is explicitly enabled", () => {
    render(
      <BlogHero
        title="Nutrition article"
        summary="Article summary"
        showSummary
      />,
    );

    const props = mocks.heroProps as {
      description?: string;
    };

    expect(props.description).toBe("Article summary");
  });

  it("links a default-locale taxonomy chip to /search?q=<term>", () => {
    render(
      <BlogHero
        title="Nutrition article"
        taxonomy={[createTaxonomyTerm("Nutrition", "nutrition")]}
      />,
    );

    const props = mocks.heroProps as {
      categories: Array<Record<string, unknown>>;
    };

    expect(props.categories).toEqual([
      {
        id: "taxonomy-nutrition",
        label: "Nutrition",
        href: "/search?q=nutrition",
      },
    ]);
  });

  it("preserves the locale prefix for localized Blog Search links", () => {
    render(
      <BlogHero
        title="Nutrición"
        localePrefix="/es-us"
        taxonomy={[createTaxonomyTerm("Nutrición", "nutricion")]}
      />,
    );

    const props = mocks.heroProps as {
      categories: Array<Record<string, unknown>>;
    };

    expect(props.categories[0]).toMatchObject({
      label: "Nutrición",
      href: "/es-us/search?q=nutrici%C3%B3n",
    });
  });

  it("renders without taxonomy when Sanity returns null for an unset array", () => {
    render(<BlogHero title="Article without tags" taxonomy={null} />);

    const props = mocks.heroProps as {
      categories: Array<Record<string, unknown>>;
    };

    expect(props.categories).toEqual([]);
  });

  it("normalizes and URL-encodes multi-word taxonomy terms", () => {
    render(
      <BlogHero
        title="Heart health"
        taxonomy={[createTaxonomyTerm("Heart Health", "heart-health")]}
      />,
    );

    const props = mocks.heroProps as {
      categories: Array<Record<string, unknown>>;
    };

    expect(props.categories[0]).toMatchObject({
      href: "/search?q=heart%20health",
    });
  });
  it("renders the visible publication date as semantic time markup", () => {
    render(
      <BlogHero
        title="Nutrition article"
        publishedDate="September 1, 2026"
        publishedDateTime="2026-09-01T12:00:00Z"
      />,
    );

    const published = screen.getByText("September 1, 2026");

    expect(published.tagName).toBe("TIME");
    expect(published.getAttribute("datetime")).toBe("2026-09-01T12:00:00Z");
  });

  it("uses the supplied localized byline label", () => {
    render(
      <BlogHero
        title="Nutrición"
        authorName="Jane Smith"
        authorHref="/es-us/authors/jane-smith"
        bylineLabel="Por"
      />,
    );

    expect(screen.getByText(/Por/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Jane Smith" }).getAttribute("href"),
    ).toBe("/es-us/authors/jane-smith");
  });
});

describe("BlogHero LCP image", () => {
  it("marks the leading Blog hero image high priority and forwards responsive candidates", () => {
    render(
      <BlogHero
        title="Nutrition"
        imageUrl="https://cdn.example.test/blog?w=1600"
        imageSrcSet="https://cdn.example.test/blog?w=480 480w, https://cdn.example.test/blog?w=1600 1600w"
      />,
    );
    const props = mocks.heroProps as Record<string, unknown>;
    expect(props.imageFetchPriority).toBe("high");
    expect(props.imageLoading).toBe("eager");
    expect(props.imageSrcSet).toContain("480w");
  });
});
