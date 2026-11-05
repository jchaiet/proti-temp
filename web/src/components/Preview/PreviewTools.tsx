import { SanityLive } from "@/sanity/live";

import { DisableDraftMode } from "./DisableDraftMode";
import { VisualEditingGate } from "./VisualEditingGate";

export function PreviewTools() {
  return (
    <>
      <SanityLive includeDrafts />
      <VisualEditingGate />
      <DisableDraftMode />
    </>
  );
}
