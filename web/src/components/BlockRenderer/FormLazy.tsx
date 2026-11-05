"use client";

import dynamic from "next/dynamic";

import type { FormRendererProps } from "./Form";

/**
 * This client boundary permits Next.js to split the interactive Form module
 * into a separate browser chunk. By default next/dynamic preserves SSR, so
 * authored content remains present in the initial HTML.
 *
 * Keep the import literal and at module scope for Next.js static analysis.
 * Do not set `ssr: false`: Form content must render on the server.
 */
export const FormLazy = dynamic<FormRendererProps>(() =>
  import("./Form").then((module) => module.Form),
);
