import { describe, expect, it } from "vitest";

import { NAVIGATION_SET_QUERY } from "./navigation";

describe("NAVIGATION_SET_QUERY", () => {
  it("uses an explicit custom Navigation Set before any inherited default", () => {
    expect(NAVIGATION_SET_QUERY).toContain(
      "defined($navigationSetId) => $navigationSetId",
    );
  });

  it("resolves inherited Navigation from Site.defaultNavigationSets", () => {
    expect(NAVIGATION_SET_QUERY).toContain('_type == "site"');
    expect(NAVIGATION_SET_QUERY).toContain("defaultNavigationSets[]._ref");
    expect(NAVIGATION_SET_QUERY).toContain("site._ref == $siteId");
    expect(NAVIGATION_SET_QUERY).toContain("locale == $locale");
  });

  it("projects Mega Menu sections, image hotspots, and deeply nested link destinations", () => {
    expect(NAVIGATION_SET_QUERY).toContain("megaMenu {");
    expect(NAVIGATION_SET_QUERY).toContain("sections[] {");
    expect(NAVIGATION_SET_QUERY).toContain(
      "illustration { asset, crop, hotspot, alt }",
    );
    expect(NAVIGATION_SET_QUERY).toContain("links[] {");
    expect(NAVIGATION_SET_QUERY).toContain("mode,");
    expect(NAVIGATION_SET_QUERY).toContain("presentation,");
    expect(NAVIGATION_SET_QUERY).toContain("ctaLabel,");
    expect(NAVIGATION_SET_QUERY).toContain(
      "image { asset, crop, hotspot, alt }",
    );
  });

  it("does not fall back to the legacy Navigation Set isDefault flag", () => {
    expect(NAVIGATION_SET_QUERY).not.toContain("isDefault");
  });

  it("projects CTA modal actions without adding Modal to normal navigation Links", () => {
    expect(NAVIGATION_SET_QUERY).toContain("actionType");
    expect(NAVIGATION_SET_QUERY).toContain("modal {");
    expect(NAVIGATION_SET_QUERY).toContain("_ref");
  });
});
