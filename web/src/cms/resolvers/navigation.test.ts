import { beforeEach, describe, expect, it, vi } from "vitest";

import { NAVIGATION_SET_QUERY } from "@/sanity/queries/navigation";

import { resolveNavigation } from "./navigation";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock:
    vi.fn<
      (query: string, params?: Record<string, unknown>) => Promise<unknown>
    >(),
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: fetchMock,
  },
}));

describe("resolveNavigation", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("passes null for inherited navigation so the query can resolve the Site default", async () => {
    fetchMock.mockResolvedValueOnce(null);

    await expect(
      resolveNavigation({
        siteId: "site-a",
        locale: "en-us",
      }),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledWith(
      NAVIGATION_SET_QUERY,
      {
        siteId: "site-a",
        locale: "en-us",
        navigationSetId: null,
      },
      {
        next: {
          revalidate: false,
        },
      },
    );
  });

  it("uses the explicitly selected custom Navigation Set", async () => {
    fetchMock.mockResolvedValueOnce(null);

    await resolveNavigation({
      siteId: "site-a",
      locale: "en-us",
      override: {
        mode: "custom",
        navigationSet: {
          _ref: "drafts.navigation-custom",
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      NAVIGATION_SET_QUERY,
      {
        siteId: "site-a",
        locale: "en-us",
        navigationSetId: "navigation-custom",
      },
      {
        next: {
          revalidate: false,
        },
      },
    );
  });

  it("does not query Sanity when Navigation is disabled", async () => {
    await expect(
      resolveNavigation({
        siteId: "site-a",
        locale: "en-us",
        override: {
          mode: "none",
        },
      }),
    ).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fall back when Custom Navigation has no selected set", async () => {
    await expect(
      resolveNavigation({
        siteId: "site-a",
        locale: "en-us",
        override: {
          mode: "custom",
        },
      }),
    ).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
