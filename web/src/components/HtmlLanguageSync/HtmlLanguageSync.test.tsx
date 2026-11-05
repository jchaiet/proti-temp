import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const navigation = vi.hoisted(() => ({
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

import { HtmlLanguageSync } from "./HtmlLanguageSync";

const locales = ["en-us", "es-us", "fr-ca"];

beforeEach(() => {
  navigation.pathname = "/";
  document.documentElement.lang = "";
});

describe("HtmlLanguageSync", () => {
  it("sets the default locale language tag on an unprefixed route", () => {
    render(<HtmlLanguageSync defaultLocale="en-us" locales={locales} />);

    expect(document.documentElement.lang).toBe("en-US");
  });

  it("sets the localized language tag on a prefixed route", () => {
    navigation.pathname = "/es-us/products/widget";

    render(<HtmlLanguageSync defaultLocale="en-us" locales={locales} />);

    expect(document.documentElement.lang).toBe("es-US");
  });

  it("updates the html language after client-side locale navigation", () => {
    const { rerender } = render(
      <HtmlLanguageSync defaultLocale="en-us" locales={locales} />,
    );

    expect(document.documentElement.lang).toBe("en-US");

    navigation.pathname = "/fr-ca/blog/example";

    rerender(<HtmlLanguageSync defaultLocale="en-us" locales={locales} />);

    expect(document.documentElement.lang).toBe("fr-CA");
  });
});
