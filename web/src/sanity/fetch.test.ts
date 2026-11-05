import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const baseFetch = vi.fn();
  const rawFetch = vi.fn();
  const withConfig = vi.fn(() => ({
    fetch: rawFetch,
  }));
  const liveFetch = vi.fn();
  const draftMode = vi.fn();

  return {
    baseFetch,
    rawFetch,
    withConfig,
    liveFetch,
    draftMode,
  };
});

vi.mock("next/headers", () => ({
  draftMode: mocks.draftMode,
}));

vi.mock("@/sanity/client", () => ({
  sanityClient: {
    fetch: mocks.baseFetch,
    withConfig: mocks.withConfig,
  },
}));

vi.mock("@/sanity/live", () => ({
  liveSanityFetch: mocks.liveFetch,
  SanityLive: vi.fn(() => null),
}));

import { sanityFetch } from "./fetch";

describe("sanityFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SANITY_API_READ_TOKEN = "viewer-token";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("preserves the existing published client path outside Draft Mode", async () => {
    mocks.draftMode.mockResolvedValue({ isEnabled: false });
    mocks.baseFetch.mockResolvedValue({ title: "Published" });

    const result = await sanityFetch<{ title: string }>("*[]", { id: "one" });

    expect(result).toEqual({ title: "Published" });
    expect(mocks.baseFetch).toHaveBeenCalledWith(
      "*[]",
      { id: "one" },
      {
        next: {
          revalidate: false,
        },
      },
    );
    expect(mocks.withConfig).not.toHaveBeenCalled();
    expect(mocks.liveFetch).not.toHaveBeenCalled();
  });

  it("can explicitly bypass the published Data Cache", async () => {
    mocks.draftMode.mockResolvedValue({ isEnabled: false });
    mocks.baseFetch.mockResolvedValue({ title: "Fresh" });

    await sanityFetch("*[]", {}, { revalidate: 0 });

    expect(mocks.baseFetch).toHaveBeenCalledWith(
      "*[]",
      {},
      {
        next: {
          revalidate: 0,
        },
      },
    );
  });

  it("bypasses the published Data Cache during local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.draftMode.mockResolvedValue({ isEnabled: false });
    mocks.baseFetch.mockResolvedValue({ title: "Fresh local publish" });

    await sanityFetch("*[]");

    expect(mocks.baseFetch).toHaveBeenCalledWith(
      "*[]",
      {},
      {
        next: {
          revalidate: 0,
        },
      },
    );
  });

  it("uses Sanity Live with the drafts perspective during visual editing", async () => {
    mocks.draftMode.mockResolvedValue({ isEnabled: true });
    mocks.liveFetch.mockResolvedValue({
      data: { title: "Draft" },
    });

    const result = await sanityFetch<{ title: string }>(
      "*[]",
      {},
      {
        visualEditing: true,
      },
    );

    expect(result).toEqual({ title: "Draft" });
    expect(mocks.baseFetch).not.toHaveBeenCalled();
    expect(mocks.withConfig).not.toHaveBeenCalled();
    expect(mocks.liveFetch).toHaveBeenCalledWith({
      query: "*[]",
      params: {},
      perspective: "drafts",
      stega: true,
    });
  });

  it("keeps forced published reads on the normal client during Draft Mode", async () => {
    mocks.draftMode.mockResolvedValue({ isEnabled: true });
    mocks.baseFetch.mockResolvedValue({ title: "Published" });

    const result = await sanityFetch<{ title: string }>(
      "*[]",
      {},
      {
        visualEditing: true,
        perspective: "published",
      },
    );

    expect(result).toEqual({ title: "Published" });
    expect(mocks.baseFetch).toHaveBeenCalledWith(
      "*[]",
      {},
      {
        next: {
          revalidate: false,
        },
      },
    );
    expect(mocks.withConfig).not.toHaveBeenCalled();
    expect(mocks.liveFetch).not.toHaveBeenCalled();
  });

  it("keeps raw reads off Sanity Live", async () => {
    mocks.draftMode.mockResolvedValue({ isEnabled: false });
    mocks.rawFetch.mockResolvedValue({ title: "Raw" });

    const result = await sanityFetch<{ title: string }>(
      "*[]",
      {},
      {
        perspective: "raw",
      },
    );

    expect(result).toEqual({ title: "Raw" });
    expect(mocks.baseFetch).not.toHaveBeenCalled();
    expect(mocks.liveFetch).not.toHaveBeenCalled();
    expect(mocks.withConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        perspective: "raw",
        useCdn: false,
        token: "viewer-token",
        stega: false,
      }),
    );
    expect(mocks.rawFetch).toHaveBeenCalledWith(
      "*[]",
      {},
      {
        next: {
          revalidate: false,
        },
      },
    );
  });

  it("bypasses the raw Data Cache during local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.draftMode.mockResolvedValue({ isEnabled: false });
    mocks.rawFetch.mockResolvedValue({ title: "Fresh raw local data" });

    await sanityFetch("*[]", {}, { perspective: "raw" });

    expect(mocks.rawFetch).toHaveBeenCalledWith(
      "*[]",
      {},
      {
        next: {
          revalidate: 0,
        },
      },
    );
  });

  it("requires a Viewer token when Draft Mode is reading drafts", async () => {
    mocks.draftMode.mockResolvedValue({ isEnabled: true });
    delete process.env.SANITY_API_READ_TOKEN;

    await expect(sanityFetch("*[]")).rejects.toThrow("SANITY_API_READ_TOKEN");
    expect(mocks.baseFetch).not.toHaveBeenCalled();
    expect(mocks.withConfig).not.toHaveBeenCalled();
    expect(mocks.liveFetch).not.toHaveBeenCalled();
  });
});
