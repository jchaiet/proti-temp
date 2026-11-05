import type { ReactNode, ImgHTMLAttributes } from "react";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (
    props: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean },
  ) => {
    const imageProps = { ...props };
    delete imageProps.unoptimized;
    return createElement("img", imageProps);
  },
}));

vi.mock("mino-ui/core/Footer", () => ({
  Footer: ({ logo, children }: { logo?: ReactNode; children?: ReactNode }) =>
    createElement("footer", null, logo, children),
  FooterColumn: ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children),
  FooterLink: ({ children, href }: { children?: ReactNode; href?: string }) =>
    createElement("a", { href }, children),
}));

import { SiteFooter } from "./SiteFooter";

const footer = {
  logo: {
    src: "https://cdn.sanity.io/images/project/dataset/logo.png",
    alt: "Proti",
  },
  columns: [],
  socialLinks: [],
  legalLinks: [],
};

describe("SiteFooter", () => {
  it("lazy loads the footer logo", () => {
    render(<SiteFooter footer={footer} homeHref="/" />);
    const logo = screen.getByRole("img", { name: "Proti" });
    expect(logo.getAttribute("loading")).toBe("lazy");
    expect(logo.closest("a")?.getAttribute("href")).toBe("/");
  });
});
