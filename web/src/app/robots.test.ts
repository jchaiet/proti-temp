import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headersGet: vi.fn(),
  buildRobotsConfig: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: mocks.headersGet,
  }),
}));

vi.mock("@/cms/resolvers/search-engine", () => ({
  buildRobotsConfig: mocks.buildRobotsConfig,
}));

import robots from "./robots";

beforeEach(() => {
  mocks.headersGet.mockReset();
  mocks.buildRobotsConfig.mockReset();
  mocks.buildRobotsConfig.mockResolvedValue({
    rules: {
      userAgent: "*",
      allow: "/",
    },
  });
});

it("prefers x-forwarded-host and forwards the public host to robots resolver", async () => {
  mocks.headersGet.mockImplementation((name: string) => {
    if (name === "x-forwarded-host") {
      return "public.example.com, internal.example.com";
    }

    if (name === "host") {
      return "fallback.example.com";
    }

    return null;
  });

  await robots();

  expect(mocks.buildRobotsConfig).toHaveBeenCalledWith("public.example.com");
});

it("falls back to the Host header", async () => {
  mocks.headersGet.mockImplementation((name: string) =>
    name === "host" ? "example.com" : null,
  );

  await robots();

  expect(mocks.buildRobotsConfig).toHaveBeenCalledWith("example.com");
});
