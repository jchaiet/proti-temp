import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocumentListBlock } from "mino-ui/blocks/DocumentListBlock";

describe("Mino DocumentListBlock date presentation", () => {
  it("formats an ISO ArticleCard date for display while hiding the raw timestamp", () => {
    const rawDate = "2026-08-31T14:17:00.000Z";

    const expected = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(rawDate));

    render(
      <DocumentListBlock
        documents={[
          {
            id: "article-1",
            contentType: "blog",
            cardType: "article",
            title: "Nutrition",
            summary: "A guide",
            url: "/blog/nutrition",
            date: rawDate,
          },
        ]}
        dateLocale="en-US"
      />,
    );

    expect(screen.getByText(expected)).toBeTruthy();
    expect(screen.queryByText(rawDate)).toBeNull();
  });

  it("uses the supplied locale for the rendered date", () => {
    const rawDate = "2026-08-31T14:17:00.000Z";

    const expected = new Intl.DateTimeFormat("es-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(rawDate));

    render(
      <DocumentListBlock
        documents={[
          {
            id: "article-es",
            contentType: "blog",
            cardType: "article",
            title: "Nutrición",
            url: "/es-us/blog/nutricion",
            date: rawDate,
          },
        ]}
        dateLocale="es-US"
      />,
    );

    expect(screen.getByText(expected)).toBeTruthy();
  });

  it("continues mapping ArticleCard Author role/title data", () => {
    render(
      <DocumentListBlock
        documents={[
          {
            id: "article-author",
            contentType: "blog",
            cardType: "article",
            title: "Nutrition",
            url: "/blog/nutrition",
            author: {
              name: "Jane Smith",
              role: "Registered Dietitian",
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("Jane Smith")).toBeTruthy();
    expect(screen.getByText("Registered Dietitian")).toBeTruthy();
  });
});
