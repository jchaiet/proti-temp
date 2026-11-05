import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formOriginAllowed } from "./origin";

function request(origin?: string, url = "https://proti.test/api/forms/submit") {
  return new Request(url, {
    method: "POST",
    headers: origin ? { Origin: origin } : undefined,
  });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("FORM_ALLOWED_ORIGINS", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_URL", "");
  vi.stubEnv("VERCEL_BRANCH_URL", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.stubEnv("VERCEL_ENV", "");
});

afterEach(() => vi.unstubAllEnvs());

describe("formOriginAllowed", () => {
  it("fails closed in production without a configured or Vercel origin", () => {
    expect(formOriginAllowed(request("https://proti.test"))).toBe(false);
  });

  it("accepts exact origins, including comma-separated explicit domains", () => {
    vi.stubEnv(
      "FORM_ALLOWED_ORIGINS",
      "https://www.proti.com, https://proti-demo-web.vercel.app",
    );
    expect(formOriginAllowed(request("https://www.proti.com"))).toBe(true);
    expect(
      formOriginAllowed(request("https://proti-demo-web.vercel.app")),
    ).toBe(true);
    expect(formOriginAllowed(request("https://www.proti.com.evil.test"))).toBe(
      false,
    );
  });

  it("accepts exact Vercel deployment and branch origins", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "proti-git-pr-team.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "proti-git-feature-team.vercel.app");
    expect(
      formOriginAllowed(request("https://proti-git-pr-team.vercel.app")),
    ).toBe(true);
    expect(
      formOriginAllowed(request("https://proti-git-feature-team.vercel.app")),
    ).toBe(true);
    expect(formOriginAllowed(request("https://unrelated.vercel.app"))).toBe(
      false,
    );
  });

  it("accepts Vercel's production alias only in its production environment", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "proti-demo-web.vercel.app");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(
      formOriginAllowed(request("https://proti-demo-web.vercel.app")),
    ).toBe(false);
    vi.stubEnv("VERCEL_ENV", "production");
    expect(
      formOriginAllowed(request("https://proti-demo-web.vercel.app")),
    ).toBe(true);
  });

  it("rejects absent, null, path-bearing, or malformed origin values", () => {
    vi.stubEnv("FORM_ALLOWED_ORIGINS", "https://proti.test");
    expect(formOriginAllowed(request())).toBe(false);
    expect(formOriginAllowed(request("null"))).toBe(false);
    expect(formOriginAllowed(request("https://proti.test/path"))).toBe(false);
    expect(formOriginAllowed(request("https://proti.test/"))).toBe(false);
    expect(formOriginAllowed(request("javascript:alert(1)"))).toBe(false);
  });

  it("does not trust Host or forwarded-host headers", () => {
    const forged = new Request("https://proti.test/api/forms/submit", {
      method: "POST",
      headers: {
        Origin: "https://attacker.test",
        Host: "attacker.test",
        "X-Forwarded-Host": "attacker.test",
      },
    });
    expect(formOriginAllowed(forged)).toBe(false);
  });

  it("uses the request origin as fallback only for local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(formOriginAllowed(request("https://proti.test"))).toBe(true);
    expect(formOriginAllowed(request("https://other.test"))).toBe(false);
  });
});
