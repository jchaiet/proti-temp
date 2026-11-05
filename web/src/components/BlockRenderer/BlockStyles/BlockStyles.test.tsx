import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BlockStyles } from "./BlockStyles";

describe("BlockStyles", () => {
  it("does not add a wrapper when all style settings use component defaults", () => {
    const { container } = render(
      <BlockStyles
        config={{
          verticalPadding: "default",
          background: "default",
          contentWidth: "default",
        }}
      >
        <section data-testid="block">Block</section>
      </BlockStyles>,
    );

    expect(container.firstElementChild?.tagName).toBe("SECTION");
  });

  it("adds the shared wrapper when a style override is authored", () => {
    const { container } = render(
      <BlockStyles
        config={{
          verticalPadding: "lg",
          background: "canvas",
          contentWidth: "wide",
        }}
      >
        <section>Block</section>
      </BlockStyles>,
    );

    const wrapper = container.firstElementChild;

    expect(wrapper?.tagName).toBe("DIV");
    expect(wrapper?.getAttribute("data-block-padding")).toBe("lg");
    expect(wrapper?.getAttribute("data-block-background")).toBe("canvas");
    expect(wrapper?.getAttribute("data-block-content-width")).toBe("wide");
  });
});
