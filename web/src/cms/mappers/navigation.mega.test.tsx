import { describe, expect, it, vi } from "vitest";

import type { CmsNavigationHeader, CmsNavigationItem } from "@/cms/types";
import { mapNavigationHeader } from "./navigation";

vi.mock("@/cms/resolvers/link", () => ({
  resolveLink: vi.fn(
    async (link: {
      type: string;
      externalUrl?: string;
      openInNewTab?: boolean;
    }) =>
      link.type === "external" && link.externalUrl
        ? {
            href: link.externalUrl,
            ...(link.openInNewTab
              ? { target: "_blank" as const, rel: "noopener noreferrer" }
              : {}),
          }
        : undefined,
  ),
}));
vi.mock("@/cms/resolvers/icon", () => ({
  resolveIcon: vi.fn((icon?: string) =>
    icon ? `resolved-icon:${icon}` : undefined,
  ),
}));
vi.mock("@/cms/resolvers/image", () => ({
  resolveSanityImage: vi.fn(() => undefined),
}));
vi.mock("@/cms/mappers/cta", () => ({ mapCtas: vi.fn(async () => []) }));

const link = (path: string) => ({
  type: "external" as const,
  externalUrl: `https://example.test${path}`,
});

function header(items: CmsNavigationItem[]): CmsNavigationHeader {
  return {
    _id: "nav-header",
    title: "Header",
    key: "header",
    logo: { mode: "none" },
    items,
  };
}

describe("Mega Menu mapper", () => {
  it("maps tile order, columns, and spans without losing links", async () => {
    const result = await mapNavigationHeader(
      header([
        {
          _key: "one",
          label: "Platform",
          mode: "mega",
          megaMenu: {
            columns: 4,
            sections: [
              {
                _key: "tiles",
                _type: "navigationMegaTilesSection",
                title: "Explore",
                span: 3,
                columns: 2,
                items: [1, 2, 3, 4, 5].map((n) => ({
                  _key: `tile-${n}`,
                  label: `Tile ${n}`,
                  link: link(`/tile-${n}`),
                  span: n === 3 ? 2 : 1,
                })),
              },
            ],
          },
        },
      ]),
    );
    const menu = result?.items[0].megaMenu;
    expect(menu?.columns).toBe(4);
    expect(menu?.sections[0]).toMatchObject({
      type: "tiles",
      columns: 2,
      span: 3,
      items: [
        { label: "Tile 1", span: 1 },
        { label: "Tile 2", span: 1 },
        { label: "Tile 3", span: 2, href: "https://example.test/tile-3" },
        { label: "Tile 4", span: 1 },
        { label: "Tile 5", span: 1 },
      ],
    });
  });

  it("combines explorer, static link lists, and featured cards", async () => {
    const result = await mapNavigationHeader(
      header([
        {
          _key: "one",
          label: "Solutions",
          mode: "mega",
          megaMenu: {
            columns: 4,
            sections: [
              {
                _key: "explorer",
                _type: "navigationMegaExplorerSection",
                span: 2,
                items: [
                  {
                    _key: "category",
                    label: "Engineering",
                    links: [
                      {
                        _key: "link",
                        label: "Automation",
                        link: link("/automation"),
                      },
                    ],
                  },
                ],
              },
              {
                _key: "links",
                _type: "navigationMegaLinksSection",
                title: "Resources",
                items: [{ _key: "docs", label: "Docs", link: link("/docs") }],
              },
              {
                _key: "feature",
                _type: "navigationMegaFeatureSection",
                title: "Contact Sales",
                link: link("/sales"),
              },
            ],
          },
        },
      ]),
    );
    expect(result?.items[0].megaMenu?.sections).toMatchObject([
      {
        type: "explorer",
        span: 2,
        items: [
          {
            label: "Engineering",
            links: [{ href: "https://example.test/automation" }],
          },
        ],
      },
      { type: "links", items: [{ href: "https://example.test/docs" }] },
      { type: "feature", href: "https://example.test/sales" },
    ]);
  });

  it("preserves legacy dropdowns and normal links", async () => {
    const result = await mapNavigationHeader(
      header([
        {
          _key: "old-dropdown",
          label: "Features",
          children: [
            { _key: "sub", label: "Analytics", link: link("/analytics") },
          ],
        },
        { _key: "old-link", label: "Pricing", link: link("/pricing") },
      ]),
    );
    expect(result?.items[0].children).toMatchObject([{ label: "Analytics" }]);
    expect(result?.items[1]).toMatchObject({
      label: "Pricing",
      href: "https://example.test/pricing",
    });
  });

  it("does not expose broken cross-locale destinations in a menu", async () => {
    const result = await mapNavigationHeader(
      header([
        {
          _key: "one",
          label: "Platform",
          mode: "mega",
          megaMenu: {
            sections: [
              {
                _key: "tiles",
                _type: "navigationMegaTilesSection",
                items: [
                  {
                    _key: "broken",
                    label: "Untranslated",
                    link: { type: "none" },
                  },
                  { _key: "working", label: "Good", link: link("/good") },
                ],
              },
            ],
          },
        },
      ]),
    );
    expect(result?.items[0].megaMenu?.sections[0]).toMatchObject({
      type: "tiles",
      items: [{ label: "Good" }],
    });
  });

  it("maps mixed Link, Tile, and Card items while resolving individual destinations", async () => {
    const result = await mapNavigationHeader(
      header([
        {
          _key: "mix",
          label: "Explore",
          mode: "mega",
          megaMenu: {
            columns: 4,
            sections: [
              {
                _key: "mixed",
                _type: "navigationMegaContentSection",
                title: "Explore",
                span: 3,
                columns: 2,
                items: [
                  {
                    _key: "link",
                    _type: "navigationSubItem",
                    label: "Docs",
                    icon: "lucide:calendar",
                    link: link("/docs"),
                  },
                  {
                    _key: "tile",
                    _type: "navigationMegaTile",
                    label: "Library",
                    link: link("/library"),
                    span: 2,
                  },
                  {
                    _key: "card",
                    _type: "navigationMegaCard",
                    title: "Case study",
                    ctaLabel: "Read case study",
                    link: link("/case-study"),
                  },
                ],
              },
            ],
          },
        },
      ]),
    );
    expect(result?.items[0].megaMenu?.sections).toMatchObject([
      {
        type: "content",
        span: 3,
        columns: 2,
        items: [
          {
            type: "link",
            label: "Docs",
            icon: "resolved-icon:lucide:calendar",
            href: "https://example.test/docs",
          },
          {
            type: "tile",
            label: "Library",
            span: 2,
            href: "https://example.test/library",
          },
          {
            type: "card",
            title: "Case study",
            ctaLabel: "Read case study",
            href: "https://example.test/case-study",
          },
        ],
      },
    ]);
  });

  it("passes Featured presentation and CTA text through without changing legacy sections", async () => {
    const result = await mapNavigationHeader(
      header([
        {
          _key: "one",
          label: "Platform",
          mode: "mega",
          megaMenu: {
            columns: 3,
            sections: [
              {
                _key: "tile",
                _type: "navigationMegaFeatureSection",
                title: "Tile",
                presentation: "tile",
                link: link("/tile"),
              },
              {
                _key: "card",
                _type: "navigationMegaFeatureSection",
                title: "Card",
                presentation: "card",
                ctaLabel: "Discover",
                link: link("/card"),
              },
              {
                _key: "legacy",
                _type: "navigationMegaFeatureSection",
                title: "Legacy",
              },
            ],
          },
        },
      ]),
    );
    expect(result?.items[0].megaMenu?.sections).toMatchObject([
      { type: "feature", presentation: "tile" },
      { type: "feature", presentation: "card", ctaLabel: "Discover" },
      { type: "feature", title: "Legacy" },
    ]);
    expect(result?.items[0].megaMenu?.sections[2]).not.toHaveProperty(
      "presentation",
      "card",
    );
  });
});

describe("Navigation new-tab CMS mapping", () => {
  const newTabLink = (path: string) => ({
    type: "external" as const,
    externalUrl: `https://example.test${path}`,
    openInNewTab: true,
  });

  it("preserves target and rel for Header, Dropdown and all Mega Menu destinations", async () => {
    const result = await mapNavigationHeader(
      header([
        { _key: "top", label: "Top", mode: "link", link: newTabLink("/top") },
        { _key: "same", label: "Same Tab", mode: "link", link: link("/same") },
        {
          _key: "dropdown",
          label: "Dropdown",
          mode: "dropdown",
          children: [
            {
              _key: "dropdown-external",
              label: "Dropdown External",
              link: newTabLink("/dropdown"),
            },
          ],
        },
        {
          _key: "mega",
          label: "Mega",
          mode: "mega",
          megaMenu: {
            sections: [
              {
                _key: "links",
                _type: "navigationMegaLinksSection",
                items: [
                  { _key: "link", label: "Link", link: newTabLink("/link") },
                ],
              },
              {
                _key: "tiles",
                _type: "navigationMegaTilesSection",
                items: [
                  { _key: "tile", label: "Tile", link: newTabLink("/tile") },
                ],
              },
              {
                _key: "mixed",
                _type: "navigationMegaContentSection",
                items: [
                  {
                    _key: "mixed-link",
                    _type: "navigationSubItem",
                    label: "Mixed Link",
                    link: newTabLink("/mixed-link"),
                  },
                  {
                    _key: "mixed-tile",
                    _type: "navigationMegaTile",
                    label: "Mixed Tile",
                    link: newTabLink("/mixed-tile"),
                  },
                  {
                    _key: "mixed-card",
                    _type: "navigationMegaCard",
                    title: "Mixed Card",
                    link: newTabLink("/mixed-card"),
                  },
                ],
              },
              {
                _key: "explorer",
                _type: "navigationMegaExplorerSection",
                items: [
                  {
                    _key: "category",
                    label: "Category",
                    links: [
                      {
                        _key: "explorer-link",
                        label: "Explorer Link",
                        link: newTabLink("/explorer"),
                      },
                    ],
                  },
                ],
              },
              {
                _key: "feature-tile",
                _type: "navigationMegaFeatureSection",
                title: "Feature Tile",
                presentation: "tile",
                link: newTabLink("/feature-tile"),
              },
              {
                _key: "feature-card",
                _type: "navigationMegaFeatureSection",
                title: "Feature Card",
                presentation: "card",
                link: newTabLink("/feature-card"),
              },
              {
                _key: "feature-legacy",
                _type: "navigationMegaFeatureSection",
                title: "Feature Legacy",
                link: newTabLink("/feature-legacy"),
              },
            ],
          },
        },
      ]),
    );

    const expected = { target: "_blank", rel: "noopener noreferrer" };
    expect(result?.items[0]).toMatchObject(expected);
    expect(result?.items[1]).not.toHaveProperty("target", "_blank");
    expect(result?.items[2].children?.[0]).toMatchObject(expected);
    const sections = result?.items[3].megaMenu?.sections;
    expect(sections?.[0]).toMatchObject({ type: "links", items: [expected] });
    expect(sections?.[1]).toMatchObject({ type: "tiles", items: [expected] });
    expect(sections?.[2]).toMatchObject({
      type: "content",
      items: [expected, expected, expected],
    });
    expect(sections?.[3]).toMatchObject({
      type: "explorer",
      items: [{ links: [expected] }],
    });
    for (const feature of sections?.slice(4) ?? []) {
      expect(feature).toMatchObject({ type: "feature", ...expected });
    }
  });
});
