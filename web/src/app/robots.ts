import type { MetadataRoute } from "next";

import { headers } from "next/headers";

import { buildRobotsConfig } from "@/cms/resolvers/search-engine";

function getRequestHost(
  requestHeaders: Awaited<ReturnType<typeof headers>>,
): string {
  const forwardedHost = requestHeaders.get("x-forwarded-host");

  const host = requestHeaders.get("host");

  return forwardedHost?.split(",")[0]?.trim() ?? host?.trim() ?? "";
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();

  return buildRobotsConfig(getRequestHost(requestHeaders));
}
