import { describe, expect, it } from "vitest";

import { buildBreadcrumbItems } from "./structured-data-breadcrumbs";

describe("buildBreadcrumbItems", () => {
  it("returns only Home for the root route", () => {
    expect(
      buildBreadcrumbItems({
        origin: "https://example.com",
        localePrefix: "",
        segments: [],
      }),
    ).toEqual([
      {
        name: "Home",
        url: "https://example.com/",
      },
    ]);
  });

  it("builds nested default-locale breadcrumbs from URL segments", () => {
    expect(
      buildBreadcrumbItems({
        origin: "https://example.com",
        localePrefix: "",
        segments: ["blog", "topics", "heart-health"],
      }),
    ).toEqual([
      {
        name: "Home",
        url: "https://example.com/",
      },
      {
        name: "Blog",
        url: "https://example.com/blog",
      },
      {
        name: "Topics",
        url: "https://example.com/blog/topics",
      },
      {
        name: "Heart Health",
        url: "https://example.com/blog/topics/heart-health",
      },
    ]);
  });

  it("preserves the locale prefix and uses the authored leaf title", () => {
    expect(
      buildBreadcrumbItems({
        origin: "https://example.com",
        localePrefix: "/es-us",
        segments: ["blog", "topics", "nutricion"],
        leafTitle: "Nutrición",
      }),
    ).toEqual([
      {
        name: "Home",
        url: "https://example.com/es-us",
      },
      {
        name: "Blog",
        url: "https://example.com/es-us/blog",
      },
      {
        name: "Topics",
        url: "https://example.com/es-us/blog/topics",
      },
      {
        name: "Nutrición",
        url: "https://example.com/es-us/blog/topics/nutricion",
      },
    ]);
  });

  it("uses the canonical leaf URL when provided", () => {
    expect(
      buildBreadcrumbItems({
        origin: "https://example.com",
        localePrefix: "",
        segments: ["products", "widget"],
        leafTitle: "Widget",
        leafUrl: "https://canonical.example.com/widget",
      }),
    ).toEqual([
      {
        name: "Home",
        url: "https://example.com/",
      },
      {
        name: "Products",
        url: "https://example.com/products",
      },
      {
        name: "Widget",
        url: "https://canonical.example.com/widget",
      },
    ]);
  });
});
