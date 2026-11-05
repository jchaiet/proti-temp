import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PortableTextBlock } from "@portabletext/types";
import { describe, expect, it, vi } from "vitest";

// Keep the Portable Text renderer real while stubbing presentation-only Mino
// components, so these tests exercise the actual CMS mark and URL handling.
vi.mock("mino-ui/blocks/RichTextBlock", () => ({
  RichTextBlock: ({ content }: { content?: ReactNode }) => (
    <section data-testid="rich-text">{content}</section>
  ),
}));

vi.mock("mino-ui/core/Heading", () => ({
  Heading: ({
    level = 2,
    children,
  }: {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    children?: ReactNode;
  }) => createElement(`h${level}`, null, children),
}));

vi.mock("mino-ui/core/Text", () => ({
  Text: ({
    as = "p",
    children,
  }: {
    as?: "p" | "span" | "div";
    children?: ReactNode;
  }) => createElement(as, null, children),
}));

vi.mock("./RichTextLink", () => ({
  RichTextLink: ({
    href,
    openInNewTab,
    children,
  }: {
    href: string;
    openInNewTab?: boolean;
    children?: ReactNode;
  }) => (
    <a
      href={href}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
}));

import { RichText } from "./RichText";

const blockPath = "src/components/BlockRenderer";

function withLink(href: string, openInNewTab = false): PortableTextBlock[] {
  return [
    {
      _type: "block",
      _key: "block-1",
      style: "normal",
      markDefs: [
        {
          _type: "link",
          _key: "link-1",
          href,
          openInNewTab,
        },
      ],
      children: [
        { _type: "span", _key: "span-1", text: "Read ", marks: [] },
        { _type: "span", _key: "span-2", text: "more", marks: ["link-1"] },
      ],
    },
  ];
}

describe("RichText server and client boundaries", () => {
  it("keeps Portable Text on the server and Mino Button in a link-only island", () => {
    const richTextSource = readFileSync(
      resolve(process.cwd(), blockPath, "RichText.tsx"),
      "utf8",
    );
    const linkSource = readFileSync(
      resolve(process.cwd(), blockPath, "RichTextLink.tsx"),
      "utf8",
    );

    expect(richTextSource).not.toMatch(/^\s*["']use client["'];/m);
    expect(richTextSource).toContain('from "@portabletext/react"');
    expect(richTextSource).toContain('from "./RichTextLink"');
    expect(richTextSource).not.toContain('from "mino-ui/core/Button"');

    expect(linkSource).toMatch(/^"use client";/);
    expect(linkSource).toContain('from "mino-ui/core/Button"');
    expect(linkSource).not.toContain("@portabletext/react");
  });

  it("renders normal Portable Text and preserves safe new-tab links", () => {
    const html = renderToStaticMarkup(
      <RichText content={withLink("https://example.com/docs", true)} />,
    );

    expect(html).toContain("Read ");
    expect(html).toContain("more");
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("does not render unsafe CMS links as anchors", () => {
    const html = renderToStaticMarkup(
      <RichText content={withLink("javascript:alert(1)")} />,
    );

    expect(html).toContain("Read ");
    expect(html).toContain("more");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("javascript:");
  });

  it("renders empty content without throwing", () => {
    expect(renderToStaticMarkup(<RichText />)).toContain("rich-text");
  });
});
