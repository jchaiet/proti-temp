import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CmsBlock } from "@/cms/types";

const loaded = vi.hoisted(() => ({
  accordion: vi.fn(),
  carousel: vi.fn(),
  content: vi.fn(),
  documentList: vi.fn(),
  form: vi.fn(),
  grid: vi.fn(),
  poll: vi.fn(),
  richText: vi.fn(),
  tabs: vi.fn(),
}));

vi.mock("@/cms/mappers/blocks", () => ({
  mapAccordionBlock: vi.fn(),
  mapCarouselBlock: vi.fn(),
  mapContentBlock: vi.fn(),
  mapDocumentListBlock: vi.fn(),
  mapFormBlock: vi.fn(),
  mapGridBlock: vi.fn(),
  mapHeroBlock: vi.fn(),
  mapPollBlock: vi.fn(),
  mapRichTextBlock: vi.fn(),
  mapTabsBlock: vi.fn(),
}));

vi.mock("./Accordion", () => {
  loaded.accordion();
  return { Accordion: () => null };
});

vi.mock("./Carousel", () => {
  loaded.carousel();
  return { Carousel: () => null };
});

vi.mock("./Content", () => {
  loaded.content();
  return {
    Content: ({ title }: { title?: string }) => (
      <div data-block="content">{title}</div>
    ),
  };
});

vi.mock("./DocumentListLazy", () => {
  loaded.documentList();
  return { DocumentListLazy: () => null };
});

vi.mock("./FormLazy", () => {
  loaded.form();
  return { FormLazy: () => null };
});

vi.mock("./Grid", () => {
  loaded.grid();
  return { Grid: () => null };
});

vi.mock("./Hero", () => ({
  Hero: ({ title }: { title?: string }) => <div data-block="hero">{title}</div>,
}));

vi.mock("./PollLazy", () => {
  loaded.poll();
  return { PollLazy: () => null };
});

vi.mock("./RichText", () => {
  loaded.richText();
  return { RichText: () => null };
});

vi.mock("./Tabs", () => {
  loaded.tabs();
  return { Tabs: () => null };
});

import {
  mapCarouselBlock,
  mapContentBlock,
  mapDocumentListBlock,
  mapFormBlock,
  mapGridBlock,
  mapHeroBlock,
  mapPollBlock,
} from "@/cms/mappers/blocks";
import { BlockRenderer } from "./index";

const context = {
  siteId: "site-1",
  locale: "en-us",
};

const cmsBlock = (type: string, key: string): CmsBlock =>
  ({ _type: type, _key: key }) as CmsBlock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BlockRenderer empty content", () => {
  it("renders nothing when blocks are undefined", async () => {
    await expect(
      BlockRenderer({ blocks: undefined, context }),
    ).resolves.toBeNull();
  });

  it("renders nothing when Sanity returns null for an unset sections array", async () => {
    await expect(BlockRenderer({ blocks: null, context })).resolves.toBeNull();
  });

  it("renders nothing when the sections array is empty", async () => {
    await expect(BlockRenderer({ blocks: [], context })).resolves.toBeNull();
  });
});

describe("BlockRenderer block selection and order", () => {
  it("renders the hero and only maps selected blocks", async () => {
    vi.mocked(mapHeroBlock).mockResolvedValue({
      title: "Page hero",
    } as Awaited<ReturnType<typeof mapHeroBlock>>);

    const tree = await BlockRenderer({
      blocks: [cmsBlock("heroBlock", "hero-1")],
      context,
    });

    expect(renderToStaticMarkup(tree)).toContain("Page hero");
    expect(mapContentBlock).not.toHaveBeenCalled();
    expect(mapGridBlock).not.toHaveBeenCalled();
    expect(mapDocumentListBlock).not.toHaveBeenCalled();
    expect(mapCarouselBlock).not.toHaveBeenCalled();
  });

  it("maps the selected blocks and preserves source order", async () => {
    vi.mocked(mapHeroBlock).mockResolvedValue({
      title: "Before",
    } as Awaited<ReturnType<typeof mapHeroBlock>>);

    vi.mocked(mapContentBlock).mockResolvedValue({
      title: "Between",
    } as Awaited<ReturnType<typeof mapContentBlock>>);

    const tree = await BlockRenderer({
      blocks: [
        cmsBlock("heroBlock", "hero-1"),
        cmsBlock("contentBlock", "content-1"),
        cmsBlock("heroBlock", "hero-2"),
      ],
      context,
    });

    const html = renderToStaticMarkup(tree);
    expect(html.match(/data-block="hero"/g)).toHaveLength(2);
    expect(html).toContain('data-block="content"');
    expect(html.indexOf('data-block="hero"')).toBeLessThan(
      html.indexOf('data-block="content"'),
    );
    expect(html.lastIndexOf('data-block="hero"')).toBeGreaterThan(
      html.indexOf('data-block="content"'),
    );
    expect(mapContentBlock).toHaveBeenCalledOnce();
    expect(mapGridBlock).not.toHaveBeenCalled();
  });
});

describe("BlockRenderer optional interactive blocks", () => {
  it("maps only the requested Form, Poll, and DocumentList blocks", async () => {
    vi.mocked(mapFormBlock).mockReturnValue({
      formKey: "contact",
      blockKey: "form-1",
    } as ReturnType<typeof mapFormBlock>);
    vi.mocked(mapPollBlock).mockReturnValue({
      pollKey: "poll-1",
      siteId: context.siteId,
      locale: context.locale,
      options: [],
    });
    vi.mocked(mapDocumentListBlock).mockResolvedValue({
      sourceMode: "manual",
      props: { documents: [] },
      enableSearch: false,
      enableSorting: false,
      enablePagination: false,
      itemsPerPage: 9,
    });

    const tree = await BlockRenderer({
      blocks: [
        cmsBlock("formBlock", "form-1"),
        cmsBlock("pollBlock", "poll-1"),
        cmsBlock("documentListBlock", "list-1"),
      ],
      context,
    });

    expect(tree).not.toBeNull();
    expect(mapFormBlock).toHaveBeenCalledOnce();
    expect(mapPollBlock).toHaveBeenCalledOnce();
    expect(mapDocumentListBlock).toHaveBeenCalledOnce();
    expect(mapHeroBlock).not.toHaveBeenCalled();
    expect(mapContentBlock).not.toHaveBeenCalled();
    expect(mapGridBlock).not.toHaveBeenCalled();
  });
});
