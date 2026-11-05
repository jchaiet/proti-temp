import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const navigation = vi.hoisted(() => ({
  pathname: "/products/widget",
  queryString: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.queryString),
}));

import { HeaderUtilities } from "./HeaderUtilities";

const locales = [
  {
    code: "en-us",
    label: "English",
  },
  {
    code: "es-us",
    label: "Spanish",
  },
];

beforeEach(() => {
  navigation.pathname = "/products/widget";
  navigation.queryString = "";
});

describe("HeaderUtilities language selector", () => {
  it("shows the currently-selected language code", () => {
    render(
      <HeaderUtilities
        locale="en-us"
        defaultLocale="en-us"
        locales={locales}
        localeHrefs={{
          "en-us": "/products/widget",
          "es-us": "/es-us/products/widget",
        }}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    ).toBeTruthy();
  });

  it("uses an exact translated equivalent when one exists", () => {
    render(
      <HeaderUtilities
        locale="en-us"
        defaultLocale="en-us"
        locales={locales}
        localeHrefs={{
          "en-us": "/products/widget",
          "es-us": "/es-us/products/widget",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/es-us/products/widget");
  });

  it("hides the language selector when the current page has no alternate translation", () => {
    render(
      <HeaderUtilities
        locale="en-us"
        defaultLocale="en-us"
        locales={locales}
        localeHrefs={{
          "en-us": "/products/widget",
        }}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: /current language/i,
      }),
    ).toBeNull();
  });

  it("preserves the current query string when switching locales", () => {
    navigation.queryString = "q=nutrition&page=2";

    render(
      <HeaderUtilities
        locale="en-us"
        defaultLocale="en-us"
        locales={locales}
        localeHrefs={{
          "en-us": "/products/widget",
          "es-us": "/es-us/products/widget",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/es-us/products/widget?q=nutrition&page=2");
  });

  it("preserves the authored Search page when switching locales", () => {
    navigation.pathname = "/search";
    navigation.queryString = "q=nutrition&page=2";

    render(
      <HeaderUtilities
        locale="en-us"
        defaultLocale="en-us"
        locales={locales}
        localeHrefs={{
          "en-us": "/search",
          "es-us": "/es-us/search",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/es-us/search?q=nutrition&page=2");
  });

  it("uses an exact generated Author locale route when provided", () => {
    navigation.pathname = "/authors/jane-smith";

    render(
      <HeaderUtilities
        locale="en-us"
        defaultLocale="en-us"
        locales={locales}
        localeHrefs={{
          "en-us": "/authors/jane-smith",
          "es-us": "/es-us/authors/jane-smith",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/es-us/authors/jane-smith");
  });

  it("uses an exact generated Taxonomy locale route when provided", () => {
    navigation.pathname = "/blog/topics/nutrition";

    render(
      <HeaderUtilities
        locale="en-us"
        defaultLocale="en-us"
        locales={locales}
        localeHrefs={{
          "en-us": "/blog/topics/nutrition",
          "es-us": "/es-us/blog/topics/nutrition",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /current language: en/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "ES",
        })
        .getAttribute("href"),
    ).toBe("/es-us/blog/topics/nutrition");
  });

  it("shows ES as selected when the active locale is Spanish", () => {
    navigation.pathname = "/es-us/products/widget";

    render(
      <HeaderUtilities
        locale="es-us"
        defaultLocale="en-us"
        locales={locales}
        localeHrefs={{
          "en-us": "/products/widget",
          "es-us": "/es-us/products/widget",
        }}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /idioma actual: es/i,
      }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: /idioma actual: es/i,
      }),
    );

    expect(
      screen
        .getByRole("menuitem", {
          name: "EN",
        })
        .getAttribute("href"),
    ).toBe("/products/widget");
  });
  it("localizes utility accessibility labels for Spanish", () => {
    navigation.pathname = "/es-us/search";

    render(
      <HeaderUtilities
        locale="es-us"
        defaultLocale="en-us"
        locales={locales}
        localeHrefs={{
          "en-us": "/search",
          "es-us": "/es-us/search",
        }}
      />,
    );

    expect(
      screen.getByRole("link", {
        name: "Buscar",
      }),
    ).toBeTruthy();

    const languageButton = screen.getByRole("button", {
      name: /idioma actual: es/i,
    });

    fireEvent.click(languageButton);

    expect(
      screen.getByRole("menu", {
        name: "Idiomas disponibles",
      }),
    ).toBeTruthy();
  });
});
