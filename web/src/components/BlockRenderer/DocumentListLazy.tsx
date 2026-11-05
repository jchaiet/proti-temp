"use client";

import dynamic from "next/dynamic";

import type { MappedDocumentListBlock } from "@/cms/mappers/blocks";

/**
 * This client boundary permits Next.js to split the interactive DocumentList module
 * into a separate browser chunk. By default next/dynamic preserves SSR, so
 * authored content remains present in the initial HTML.
 *
 * Keep the import literal and at module scope for Next.js static analysis.
 * Do not set `ssr: false`: DocumentList content must render on the server.
 */
export const DocumentListLazy = dynamic<MappedDocumentListBlock>(() =>
  import("./DocumentList").then((module) => module.DocumentList),
);
