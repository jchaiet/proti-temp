"use client";

import dynamic from "next/dynamic";

import type { MappedPollBlockProps } from "@/cms/mappers/blocks";

/**
 * This client boundary permits Next.js to split the interactive Poll module
 * into a separate browser chunk. By default next/dynamic preserves SSR, so
 * authored content remains present in the initial HTML.
 *
 * Keep the import literal and at module scope for Next.js static analysis.
 * Do not set `ssr: false`: Poll content must render on the server.
 */
export const PollLazy = dynamic<MappedPollBlockProps>(() =>
  import("./Poll").then((module) => module.Poll),
);
