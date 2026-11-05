import { describe, expect, it } from "vitest";

import { REDIRECT_BY_SOURCE_QUERY } from "./redirect";

describe("REDIRECT_BY_SOURCE_QUERY", () => {
  it("scopes Redirect lookup by Site, Locale, enabled state, and source variants", () => {
    expect(REDIRECT_BY_SOURCE_QUERY).toContain("site._ref == $siteId");
    expect(REDIRECT_BY_SOURCE_QUERY).toContain("locale == $locale");
    expect(REDIRECT_BY_SOURCE_QUERY).toContain("enabled != false");
    expect(REDIRECT_BY_SOURCE_QUERY).toContain("sourcePath in $sourcePaths");
  });

  it("returns the complete matching set so ambiguous source variants can fail closed", () => {
    expect(REDIRECT_BY_SOURCE_QUERY).not.toContain("][0]");
  });
});
