import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveLink } from "./link";

const { getPageUrlMock } = vi.hoisted(() => ({
  getPageUrlMock: vi.fn<(pageId: string) => Promise<string | null>>(),
}));

vi.mock("@/sanity/queries/page-url", () => ({
  getPageUrl: getPageUrlMock,
}));

describe("resolveLink: incomplete CMS content", () => {
  beforeEach(() => {
    getPageUrlMock.mockReset();
  });

  it("skips missing Link objects instead of throwing during page rendering", async () => {
    await expect(resolveLink(undefined)).resolves.toBeUndefined();
    await expect(resolveLink(null)).resolves.toBeUndefined();
    await expect(resolveLink({ type: "none" })).resolves.toBeUndefined();
    expect(getPageUrlMock).not.toHaveBeenCalled();
  });

  it("skips incomplete destinations", async () => {
    await expect(resolveLink({ type: "internal" })).resolves.toBeUndefined();
    await expect(resolveLink({ type: "external" })).resolves.toBeUndefined();
    await expect(resolveLink({ type: "email" })).resolves.toBeUndefined();
    await expect(resolveLink({ type: "phone" })).resolves.toBeUndefined();
    await expect(resolveLink({ type: "anchor" })).resolves.toBeUndefined();
    expect(getPageUrlMock).not.toHaveBeenCalled();
  });

  it("preserves internal Page URL resolution and skips unpublished targets", async () => {
    getPageUrlMock.mockResolvedValueOnce("/products/widget");
    await expect(
      resolveLink({ type: "internal", internalPage: { _ref: "page-a" } }),
    ).resolves.toEqual({ href: "/products/widget" });
    expect(getPageUrlMock).toHaveBeenCalledWith("page-a");

    getPageUrlMock.mockResolvedValueOnce(null);
    await expect(
      resolveLink({ type: "internal", internalPage: { _ref: "unpublished" } }),
    ).resolves.toBeUndefined();
  });

  it("preserves external link new-tab security attributes", async () => {
    await expect(
      resolveLink({
        type: "external",
        externalUrl: "https://example.test/resource",
        openInNewTab: true,
      }),
    ).resolves.toEqual({
      href: "https://example.test/resource",
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });

  it("refuses unsafe external URLs from imported CMS data", async () => {
    for (const externalUrl of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "//attacker.test",
      "https://user:secret@example.com/",
    ]) {
      await expect(
        resolveLink({ type: "external", externalUrl }),
      ).resolves.toBeUndefined();
    }
  });

  it("preserves email, phone and anchor destinations", async () => {
    await expect(
      resolveLink({ type: "email", email: "team@example.test" }),
    ).resolves.toEqual({
      href: "mailto:team@example.test",
    });
    await expect(
      resolveLink({ type: "phone", phone: "+1 (555) 012-3000" }),
    ).resolves.toEqual({
      href: "tel:+15550123000",
    });
    await expect(
      resolveLink({ type: "anchor", anchor: "#details" }),
    ).resolves.toEqual({
      href: "#details",
    });
  });
});
