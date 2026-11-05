import { describe, expect, it } from "vitest";

import { ACCORDION_BLOCK_FRAGMENT } from "./accordion";
import { CAROUSEL_BLOCK_FRAGMENT } from "./carousel";
import { CONTENT_BLOCK_FRAGMENT } from "./content";
import { DOCUMENT_LIST_BLOCK_FRAGMENT } from "./documentList";
import { FORM_BLOCK_FRAGMENT } from "./form";
import { GRID_BLOCK_FRAGMENT } from "./grid";
import { HERO_BLOCK_FRAGMENT } from "./hero";
import { POLL_BLOCK_FRAGMENT } from "./poll";
import { RICH_TEXT_BLOCK_FRAGMENT } from "./richText";
import { TABS_BLOCK_FRAGMENT } from "./tabs";

describe("block styles GROQ fragments", () => {
  it("projects the shared styles object for every reusable block", () => {
    const fragments = [
      HERO_BLOCK_FRAGMENT,
      CAROUSEL_BLOCK_FRAGMENT,
      ACCORDION_BLOCK_FRAGMENT,
      CONTENT_BLOCK_FRAGMENT,
      TABS_BLOCK_FRAGMENT,
      FORM_BLOCK_FRAGMENT,
      GRID_BLOCK_FRAGMENT,
      DOCUMENT_LIST_BLOCK_FRAGMENT,
      RICH_TEXT_BLOCK_FRAGMENT,
      POLL_BLOCK_FRAGMENT,
    ];

    for (const fragment of fragments) {
      expect(fragment).toContain("styles {");
      expect(fragment).toContain("verticalPadding");
      expect(fragment).toContain("background");
      expect(fragment).toContain("contentWidth");
    }
  });
});
