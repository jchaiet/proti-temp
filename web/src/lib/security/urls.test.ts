import { describe, expect, it } from "vitest";

import { isSafeContentHref, isSafeRedirectPath, isSafeWebUrl } from "./urls";

describe("CMS URL safety", () => {
  it("accepts normal public web destinations without embedded credentials", () => {
    expect(isSafeWebUrl("https://example.com/path?x=1#details")).toBe(true);
    expect(isSafeWebUrl("http://example.com/")).toBe(true);
    expect(isSafeWebUrl("https://user:pass@example.com")).toBe(false);
  });

  it("rejects unsafe schemes, protocol-relative and malformed web URLs", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "//attacker.example",
      "https://example.com\\@attacker.example",
      " https://example.com",
      "https://example.com\nmalicious",
      "mailto:test@example.com",
      "/relative",
    ]) {
      expect(isSafeWebUrl(url), url).toBe(false);
    }
  });

  it("allows supported rich text schemes and same-site URLs", () => {
    for (const href of [
      "https://example.com/faq",
      "mailto:help@example.com",
      "tel:+15551234567",
      "/products/widget",
      "#details",
    ]) {
      expect(isSafeContentHref(href), href).toBe(true);
    }
  });

  it("refuses executable, protocol-relative and blank rich text links", () => {
    for (const href of [
      "javascript:alert(1)",
      "//evil.test",
      "data:text/html,hi",
      "",
      "#",
    ]) {
      expect(isSafeContentHref(href), href).toBe(false);
    }
  });

  it("allows only same-site redirect path destinations", () => {
    expect(isSafeRedirectPath("/products/widget")).toBe(true);
    expect(isSafeRedirectPath("/")).toBe(true);
    for (const path of [
      "//attacker.test",
      "https://attacker.test",
      "/\\attacker.test",
      "/foo?bar=1",
      "/foo#section",
    ]) {
      expect(isSafeRedirectPath(path), path).toBe(false);
    }
  });
});
