import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headersGet: vi.fn(),
  buildSiteSitemap: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: mocks.headersGet,
  }),
}));

vi.mock("@/cms/resolvers/search-engine", () => ({
  buildSiteSitemap: mocks.buildSiteSitemap,
}));

import sitemap from "./sitemap";

beforeEach(() => {
  mocks.headersGet.mockReset();
  mocks.buildSiteSitemap.mockReset();
  mocks.buildSiteSitemap.mockResolvedValue([]);
});

it("prefers x-forwarded-host and uses only the first forwarded value", async () => {
  mocks.headersGet.mockImplementation((name: string) => {
    if (name === "x-forwarded-host") {
      return "public.example.com, internal.example.com";
    }

    if (name === "host") {
      return "fallback.example.com";
    }

    return null;
  });

  await sitemap();

  expect(mocks.buildSiteSitemap).toHaveBeenCalledWith("public.example.com");
});

it("falls back to the Host header", async () => {
  mocks.headersGet.mockImplementation((name: string) =>
    name === "host" ? "example.com" : null,
  );

  await sitemap();

  expect(mocks.buildSiteSitemap).toHaveBeenCalledWith("example.com");
});
