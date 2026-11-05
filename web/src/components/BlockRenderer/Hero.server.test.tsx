import { readFileSync } from "node:fs";

import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Hero } from "./Hero";

describe("Hero server/client integration", () => {
  it("keeps the Hero wrapper server-compatible and only its actions client-side", () => {
    const heroSource = readFileSync(
      "src/components/BlockRenderer/Hero.tsx",
      "utf8",
    );

    const actionsSource = readFileSync(
      "src/components/BlockRenderer/HeroActions.tsx",
      "utf8",
    );

    expect(heroSource).not.toMatch(/^\s*["']use client["'];?/);
    expect(actionsSource).toMatch(/^"use client";/);
    expect(heroSource).toContain("<HeroActions ctas={ctas} />");
  });

  it("preserves eager/high LCP image metadata in server-rendered HTML", () => {
    const html = renderToStaticMarkup(
      <Hero
        title="Featured page"
        imageSrc="https://example.test/hero-1920.jpg"
        imageAlt="Featured skyline"
        imageSrcSet="https://example.test/hero-480.jpg 480w, https://example.test/hero-1920.jpg 1920w"
        imageSizes="100vw"
        imageWidth={1920}
        imageHeight={1080}
        imageLoading="eager"
        imageFetchPriority="high"
        ctas={[{ as: "a", href: "/explore", label: "Explore" }]}
      />,
    );

    expect(html).toMatch(/fetchpriority="high"/i);
    expect(html).toContain('loading="eager"');
    expect(html).toContain('sizes="100vw"');
    expect(html).toContain("480w");
    expect(html).toContain('href="/explore"');
    expect(html).toContain('width="1920"');
  });

  it("keeps links and modal CTA events working in the client island", () => {
    const seen: Array<{ id?: unknown }> = [];
    const onOpen = (event: Event) => {
      seen.push((event as CustomEvent<{ id?: unknown }>).detail);
    };

    window.addEventListener("mino:open-modal", onOpen);
    try {
      render(
        <Hero
          title="Actions"
          ctas={[
            { as: "a", href: "/learn", label: "Learn more" },
            {
              as: "button",
              label: "Open modal",
              modalPayload: { id: "dialog-1" },
            },
          ]}
        />,
      );

      const link = screen.getByRole("button", { name: "Learn more" });
      expect(link.getAttribute("href")).toBe("/learn");

      fireEvent.click(screen.getByRole("button", { name: "Open modal" }));
      expect(seen).toEqual([{ id: "dialog-1" }]);
    } finally {
      window.removeEventListener("mino:open-modal", onOpen);
    }
  });
});
