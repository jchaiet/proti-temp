"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

/**
 * A lightweight alternative to next-sanity/hooks for hiding the standalone
 * Exit Preview link in an embedded preview or a pop-out window.
 *
 * This detects the browser context, not Sanity's exact Presentation Tool state.
 * In particular, it intentionally hides the link in any iframe or pop-out.
 */
export function isEmbeddedPreviewWindow(context: {
  self: unknown;
  top: unknown;
  opener: unknown;
}): boolean {
  return context.self !== context.top || context.opener != null;
}

const subscribeToWindowContext = () => () => {};

function getWindowContextSnapshot(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return isEmbeddedPreviewWindow(window);
  } catch {
    return true;
  }
}

export function DisableDraftMode() {
  // Hidden during SSR/hydration, then shown only for standalone browser tabs.
  // No state-setting effect or Sanity client hook is needed.
  const isEmbeddedPreview = useSyncExternalStore(
    subscribeToWindowContext,
    getWindowContextSnapshot,
    () => true,
  );

  if (isEmbeddedPreview) {
    return null;
  }

  return (
    <Link
      href="/api/draft-mode/disable"
      prefetch={false}
      style={{
        position: "fixed",
        right: "1rem",
        bottom: "1rem",
        zIndex: 2147483647,
        borderRadius: "999px",
        padding: "0.625rem 1rem",
        background: "#111",
        color: "#fff",
        fontSize: "0.875rem",
        textDecoration: "none",
        boxShadow: "0 4px 16px rgb(0 0 0 / 20%)",
      }}
    >
      Exit preview
    </Link>
  );
}
