import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DisableDraftMode, isEmbeddedPreviewWindow } from "./DisableDraftMode";

describe("DisableDraftMode", () => {
  it("renders an explicit link to the draft-mode disable endpoint in a standalone tab", async () => {
    render(<DisableDraftMode />);

    const link = await screen.findByRole("link", {
      name: "Exit preview",
    });

    expect(link.getAttribute("href")).toBe("/api/draft-mode/disable");
  });

  it("identifies embedded iframes without importing Sanity hooks", () => {
    const frame = {};
    const parentWindow = {};

    expect(
      isEmbeddedPreviewWindow({
        self: frame,
        top: parentWindow,
        opener: null,
      }),
    ).toBe(true);
  });

  it("identifies pop-out windows without importing Sanity hooks", () => {
    const browserWindow = {};

    expect(
      isEmbeddedPreviewWindow({
        self: browserWindow,
        top: browserWindow,
        opener: {},
      }),
    ).toBe(true);
  });

  it("allows a standalone browser tab to show the exit link", () => {
    const browserWindow = {};

    expect(
      isEmbeddedPreviewWindow({
        self: browserWindow,
        top: browserWindow,
        opener: null,
      }),
    ).toBe(false);
  });
});
