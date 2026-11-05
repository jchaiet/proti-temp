import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CmsBlock } from "@/cms/types";

const mocks = vi.hoisted(() => ({
  mapContentBlock: vi.fn(async () => ({ imageSrc: "/content.webp" })),
}));

vi.mock("@/cms/mappers/blocks", () => ({
  mapAccordionBlock: vi.fn(),
  mapCarouselBlock: vi.fn(),
  mapContentBlock: mocks.mapContentBlock,
  mapDocumentListBlock: vi.fn(),
  mapFormBlock: vi.fn(),
  mapGridBlock: vi.fn(),
  mapHeroBlock: vi.fn(),
  mapPollBlock: vi.fn(),
  mapRichTextBlock: vi.fn(),
  mapTabsBlock: vi.fn(),
}));

vi.mock("./Content", () => ({ Content: () => null }));
vi.mock("./Accordion", () => ({ Accordion: () => null }));
vi.mock("./Carousel", () => ({ Carousel: () => null }));
vi.mock("./DocumentList", () => ({ DocumentList: () => null }));
vi.mock("./Form", () => ({ Form: () => null }));
vi.mock("./Grid", () => ({ Grid: () => null }));
vi.mock("./Hero", () => ({ Hero: () => null }));
vi.mock("./Poll", () => ({ Poll: () => null }));
vi.mock("./RichText", () => ({ RichText: () => null }));
vi.mock("./Tabs", () => ({ Tabs: () => null }));

import { BlockRenderer } from "./index";

type ImageProps = {
  imageLoading?: "eager" | "lazy";
  imageFetchPriority?: "high" | "auto";
};
type WrappedContent = ReactElement<{ children: ReactElement<ImageProps> }>;
type Result = ReactElement<{ children: WrappedContent[] }>;

const blocks = [
  { _type: "contentBlock", _key: "first" },
  { _type: "contentBlock", _key: "second" },
] as CmsBlock[];
const context = { siteId: "site", locale: "en-us" };

describe("Content image LCP priority", () => {
  it("loads only a first visible Content image eagerly", async () => {
    const tree = (await BlockRenderer({
      blocks,
      context,
    })) as unknown as Result;
    const items = tree.props.children;
    expect(items[0].props.children.props.imageLoading).toBe("eager");
    expect(items[0].props.children.props.imageFetchPriority).toBe("high");
    expect(items[1].props.children.props.imageLoading).toBe("lazy");
    expect(items[1].props.children.props.imageFetchPriority).toBe("auto");
  });

  it("does not prioritize Content after a Blog hero", async () => {
    const tree = (await BlockRenderer({
      blocks: [blocks[0]],
      context: { ...context, priorityHeroImage: false },
    })) as unknown as Result;
    expect(tree.props.children[0].props.children.props.imageLoading).toBe(
      "lazy",
    );
    expect(tree.props.children[0].props.children.props.imageFetchPriority).toBe(
      "auto",
    );
  });
});
