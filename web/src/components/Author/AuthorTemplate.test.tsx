import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CmsAuthorPage } from "@/cms/types/author";

const mocks = vi.hoisted(() => ({
  documentListProps: null as Record<string, unknown> | null,
}));

vi.mock("mino-ui/core/Button", () => ({
  Button: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock("mino-ui/core/ButtonGroup", () => ({
  ButtonGroup: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("mino-ui/core/Divider", () => ({
  Divider: () => <hr />,
}));

vi.mock("mino-ui/blocks/ContentBlock", () => ({
  ContentBlock: ({
    title,
    description,
  }: {
    title?: ReactNode;
    description?: ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      {description}
    </section>
  ),
}));

vi.mock("mino-ui/blocks/DocumentListBlock", () => ({
  DocumentListBlock: (props: Record<string, unknown>) => {
    mocks.documentListProps = props;

    return <section data-testid="author-articles" />;
  },
}));

vi.mock("mino-ui/blocks/RichTextBlock", () => ({
  RichTextBlock: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock("@/components/BlockRenderer/RichText", () => ({
  RichText: ({ content }: { content: unknown[] }) => (
    <div data-testid="author-portable-bio">{JSON.stringify(content)}</div>
  ),
}));

import { AuthorTemplate } from "./AuthorTemplate";

function buildPage(locale: string): CmsAuthorPage {
  return {
    locale,
    author: {
      _id: "author-1",
      _type: "author",
      siteId: "site-proti",
      slug: "jane-smith",
      name: "Jane Smith",
      jobTitle: "Registered Dietitian",
      bioRichText: "Jane helps people make practical nutrition choices.",
      expertise: ["Nutrition"],
      credentials: [
        {
          name: "RDN",
          category: "Certification",
        },
      ],
      affiliation: {
        name: "Example Health",
      },
    },
    articles: [
      {
        _id: "blog-1",
        title: "Nutrition Basics",
        slug: "nutrition-basics",
        publishedAt: "2026-09-08T16:44:40Z",
      },
    ],
  };
}

beforeEach(() => {
  mocks.documentListProps = null;
});

describe("AuthorTemplate localization", () => {
  it("uses the English Author application messages", () => {
    render(<AuthorTemplate page={buildPage("en-us")} />);

    expect(screen.getByText("Expertise")).toBeTruthy();
    expect(screen.getByText("Credentials")).toBeTruthy();
    expect(screen.getByText("Affiliation")).toBeTruthy();

    expect(
      screen.getByRole("complementary", {
        name: "Expertise & Credentials",
      }),
    ).toBeTruthy();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Jane Smith",
      }),
    ).toBeTruthy();

    expect(
      screen.queryByRole("heading", {
        level: 3,
        name: "Expertise",
      }),
    ).toBeNull();

    const props = mocks.documentListProps as {
      title: string;
      emptyStateText: string;
      documents: Array<{ date?: string }>;
    };

    expect(props.title).toBe("Articles Written By Jane Smith");
    expect(props.emptyStateText).toBe(
      "No published articles by Jane Smith yet.",
    );

    expect(props.documents[0]?.date).toBe(
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date("2026-09-08T16:44:40Z")),
    );
  });

  it("uses the Spanish Author application messages and date locale", () => {
    render(<AuthorTemplate page={buildPage("es-us")} localePrefix="/es-us" />);

    expect(screen.getByText("Especialización")).toBeTruthy();
    expect(screen.getByText("Credenciales")).toBeTruthy();
    expect(screen.getByText("Afiliación")).toBeTruthy();

    const props = mocks.documentListProps as {
      title: string;
      emptyStateText: string;
      documents: Array<{ date?: string; url: string }>;
    };

    expect(props.title).toBe("Artículos escritos por Jane Smith");
    expect(props.emptyStateText).toBe(
      "Aún no hay artículos publicados por Jane Smith.",
    );
    expect(props.documents[0]?.url).toBe("/es-us/blog/nutrition-basics");

    expect(props.documents[0]?.date).toBe(
      new Intl.DateTimeFormat("es-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date("2026-09-08T16:44:40Z")),
    );
  });
  it("renders native Portable Text for the Author bio when available", () => {
    const page = buildPage("en-us");

    page.author.bioPortableText = [
      {
        _key: "bio-1",
        _type: "block",
        style: "normal",
        markDefs: [],
        children: [
          {
            _key: "span-1",
            _type: "span",
            marks: [],
            text: "Native portable bio",
          },
        ],
      },
    ];

    render(<AuthorTemplate page={page} />);

    expect(screen.getByTestId("author-portable-bio").textContent).toContain(
      "Native portable bio",
    );
  });
});
