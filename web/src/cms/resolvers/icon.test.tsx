import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { CmsIcon } from "@/cms/types";
import { resolveIcon } from "./icon";

// Keep this set aligned with Studio's ICON_OPTIONS (studio/lib/icons.tsx).
// Studio is a separate app and cannot be imported into the web test suite.
const studioIconValues: CmsIcon[] = [
  "lucide:arrow-right",
  "lucide:arrow-left",
  "lucide:arrow-up-right",
  "lucide:chevron-right",
  "lucide:chevron-left",
  "lucide:download",
  "lucide:external-link",
  "lucide:mail",
  "lucide:phone",
  "lucide:plus",
  "lucide:search",
  "lucide:calendar",
  "lucide:play",
  "lucide:check",
  "lucide:x",
  "lucide:info",
  "material:arrow-right",
  "material:arrow-left",
  "material:download",
  "material:external-link",
  "material:mail",
  "material:phone",
  "material:search",
  "material:calendar",
  "material:play",
  "material:check",
  "material:info",
];

describe("resolveIcon", () => {
  it.each(studioIconValues)("renders the Studio icon %s", (value) => {
    const icon = resolveIcon(value);

    expect(icon).toBeDefined();
    expect(renderToStaticMarkup(icon)).toContain("<svg");
  });

  it("omits missing or unsupported icon values gracefully", () => {
    expect(resolveIcon(undefined)).toBeUndefined();
    expect(resolveIcon("lucide:missing-icon")).toBeUndefined();
  });
});
