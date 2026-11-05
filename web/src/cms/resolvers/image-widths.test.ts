import { describe, expect, it } from "vitest";

import { SANITY_RESPONSIVE_WIDTHS } from "./image-widths";

describe("shared Sanity responsive image width ladders", () => {
  it("uses 768px consistently rather than separate 768px and 800px requests", () => {
    for (const widths of Object.values(SANITY_RESPONSIVE_WIDTHS)) {
      expect(widths).toContain(768);
      expect(widths).not.toContain(800);
      expect([...widths].sort((a, b) => a - b)).toEqual([...widths]);
      expect(new Set(widths).size).toBe(widths.length);
    }
  });

  it("retains hero high-resolution candidates and small content sizes", () => {
    expect(SANITY_RESPONSIVE_WIDTHS.hero).toContain(1920);
    expect(SANITY_RESPONSIVE_WIDTHS.content).toContain(160);
    expect(SANITY_RESPONSIVE_WIDTHS.standard).toContain(1200);
  });
});
