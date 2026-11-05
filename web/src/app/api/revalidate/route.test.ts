import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { parseBodyMock, revalidatePathMock, resolveRevalidationPlanMock } =
  vi.hoisted(() => ({
    parseBodyMock: vi.fn(),
    revalidatePathMock: vi.fn<(path: string) => void>(),
    resolveRevalidationPlanMock: vi.fn<
      (payload: unknown) => Promise<{
        documentId: string;
        documentType: "singleton";
        paths: string[];
      } | null>
    >(),
  }));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next-sanity/webhook", () => ({
  parseBody: parseBodyMock,
}));

vi.mock("@/cms/revalidation/dependencies", () => ({
  resolveRevalidationPlan: resolveRevalidationPlanMock,
}));

import { POST } from "./route";

const validBody = {
  after: {
    _id: "singleton-a",
    _type: "singleton",
  },
};

function createRequest(body: unknown = validBody) {
  return new NextRequest("http://localhost/api/revalidate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sanity-webhook-signature": "test-signature",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    process.env.SANITY_REVALIDATE_SECRET = "test-secret";

    parseBodyMock.mockReset();
    revalidatePathMock.mockReset();
    resolveRevalidationPlanMock.mockReset();

    parseBodyMock.mockResolvedValue({
      isValidSignature: true,
      body: validBody,
    });
  });

  afterEach(() => {
    delete process.env.SANITY_REVALIDATE_SECRET;
  });

  it("validates the native Sanity webhook signature", async () => {
    resolveRevalidationPlanMock.mockResolvedValueOnce({
      documentId: "singleton-a",
      documentType: "singleton",
      paths: ["/"],
    });

    const request = createRequest();

    await POST(request);

    expect(parseBodyMock).toHaveBeenCalledWith(request, "test-secret", false);
  });

  it("rejects an invalid Sanity webhook signature", async () => {
    parseBodyMock.mockResolvedValueOnce({
      isValidSignature: false,
      body: validBody,
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(401);
    expect(resolveRevalidationPlanMock).not.toHaveBeenCalled();
  });

  it("fails closed when the server secret is missing", async () => {
    delete process.env.SANITY_REVALIDATE_SECRET;

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    expect(parseBodyMock).not.toHaveBeenCalled();
    expect(resolveRevalidationPlanMock).not.toHaveBeenCalled();
  });

  it("revalidates every path in the dependency plan", async () => {
    resolveRevalidationPlanMock.mockResolvedValueOnce({
      documentId: "singleton-a",
      documentType: "singleton",
      paths: ["/", "/products", "/es-us/products"],
    });

    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(revalidatePathMock.mock.calls).toEqual([
      ["/"],
      ["/products"],
      ["/es-us/products"],
    ]);
    expect(json).toMatchObject({
      revalidated: true,
      documentId: "singleton-a",
      count: 3,
    });
  });

  it("rejects a payload that does not identify a supported document", async () => {
    parseBodyMock.mockResolvedValueOnce({
      isValidSignature: true,
      body: {},
    });
    resolveRevalidationPlanMock.mockResolvedValueOnce(null);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects malformed webhook bodies", async () => {
    parseBodyMock.mockRejectedValueOnce(new Error("Invalid body"));

    const response = await POST(createRequest());

    expect(response.status).toBe(400);
    expect(resolveRevalidationPlanMock).not.toHaveBeenCalled();
  });
});
