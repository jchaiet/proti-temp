import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: fetchMock,
  },
}));

import { getModals, MODALS_QUERY } from "./modal";

beforeEach(() => {
  fetchMock.mockReset();
});

describe("Modal queries", () => {
  it("keeps Modals scoped to the requested Site and Locale", () => {
    expect(MODALS_QUERY).toContain('_type == "modal"');
    expect(MODALS_QUERY).toContain("site._ref == $siteId");
    expect(MODALS_QUERY).toContain("locale == $locale");
  });

  it("projects the supported modal body blocks", () => {
    expect(MODALS_QUERY).toContain("content[]");
    expect(MODALS_QUERY).toContain('_type == "contentBlock"');
    expect(MODALS_QUERY).toContain('_type == "richTextBlock"');
    expect(MODALS_QUERY).toContain('_type == "accordionBlock"');
    expect(MODALS_QUERY).toContain('_type == "tabsBlock"');
    expect(MODALS_QUERY).toContain('_type == "formBlock"');
  });

  it("passes Site, Locale, and visual-editing state through the fetch layer", async () => {
    fetchMock.mockResolvedValueOnce([]);

    await expect(
      getModals({
        siteId: "site-a",
        locale: "en-us",
        visualEditing: false,
      }),
    ).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledWith(
      MODALS_QUERY,
      {
        siteId: "site-a",
        locale: "en-us",
      },
      expect.any(Object),
    );
  });
});
