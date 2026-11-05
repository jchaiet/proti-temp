"use client";

import dynamic from "next/dynamic";

const VisualEditing = dynamic(
  () =>
    import("next-sanity/visual-editing").then((module) => module.VisualEditing),
  {
    ssr: false,
  },
);

export function VisualEditingGate() {
  return <VisualEditing />;
}
