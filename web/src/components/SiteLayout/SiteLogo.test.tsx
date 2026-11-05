import { createElement, type ImgHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (
    props: ImgHTMLAttributes<HTMLImageElement> & {
      unoptimized?: boolean;
    },
  ) => {
    const imageProps = { ...props };

    delete imageProps.unoptimized;

    return createElement("img", imageProps);
  },
}));

import { SiteLogo } from "./SiteLogo";

describe("SiteLogo", () => {
  it("renders an image logo as a Home link with stable dimensions", () => {
    render(
      <SiteLogo
        href="/"
        logo={{
          src: "https://cdn.sanity.io/images/project/dataset/logo.png",
          alt: "Proti",
        }}
      />,
    );

    const link = screen.getByRole("link", {
      name: "Proti home",
    });
    const image = screen.getByRole("img", {
      name: "Proti",
    });

    expect(link.getAttribute("href")).toBe("/");
    expect(image.getAttribute("src")).toBe(
      "https://cdn.sanity.io/images/project/dataset/logo.png",
    );
    expect(image.getAttribute("width")).toBe("180");
    expect(image.getAttribute("height")).toBe("40");
    expect(image.getAttribute("loading")).toBe("eager");
  });

  it("supports lazy loading when placed below the fold", () => {
    render(
      <SiteLogo
        href="/"
        loading="lazy"
        logo={{ src: "/logo.svg", alt: "Logo" }}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Logo" }).getAttribute("loading"),
    ).toBe("lazy");
  });

  it("falls back to the configured text when no image source exists", () => {
    render(
      <SiteLogo
        href="/"
        logo={{
          alt: "",
          text: "Proti",
        }}
      />,
    );

    const link = screen.getByRole("link", {
      name: "Proti home",
    });

    expect(link.textContent).toBe("Proti");
  });
});
