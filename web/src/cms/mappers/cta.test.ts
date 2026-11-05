import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveLinkMock, resolveIconMock } = vi.hoisted(() => ({
  resolveLinkMock: vi.fn(),
  resolveIconMock: vi.fn(),
}));

vi.mock("@/cms/resolvers/link", () => ({
  resolveLink: resolveLinkMock,
}));

vi.mock("@/cms/resolvers/icon", () => ({
  resolveIcon: resolveIconMock,
}));

import { mapCta } from "./cta";

beforeEach(() => {
  resolveLinkMock.mockReset();
  resolveIconMock.mockReset();
  resolveIconMock.mockReturnValue(undefined);
});

describe("mapCta", () => {
  it("maps an Open Modal CTA to a real button and modal payload", async () => {
    await expect(
      mapCta({
        label: "Open details",
        actionType: "modal",
        modal: { _ref: "modal-product-details" },
      }),
    ).resolves.toMatchObject({
      as: "button",
      label: "Open details",
      modalPayload: {
        id: "modal-product-details",
      },
    });

    expect(resolveLinkMock).not.toHaveBeenCalled();
  });

  it("keeps legacy CTAs without actionType working as normal links", async () => {
    resolveLinkMock.mockResolvedValueOnce({
      href: "/products/widget",
    });

    await expect(
      mapCta({
        label: "View Widget",
        link: {
          type: "internal",
          internalPage: { _ref: "page-widget" },
        },
      }),
    ).resolves.toMatchObject({
      as: "a",
      href: "/products/widget",
      label: "View Widget",
    });
  });

  it("drops an invalid modal CTA with no Modal reference", async () => {
    await expect(
      mapCta({
        label: "Broken modal",
        actionType: "modal",
      }),
    ).resolves.toBeNull();
  });
});
