import type { ReactNode } from "react";

import { PortableText } from "@portabletext/react";

import type { PortableTextBlock } from "@portabletext/types";

import { Heading } from "mino-ui/core/Heading";
import { Text } from "mino-ui/core/Text";

import { RichTextBlock } from "mino-ui/blocks/RichTextBlock";
import { isSafeContentHref } from "@/lib/security/urls";
import { RichTextLink } from "./RichTextLink";

import type { RichTextBlockProps } from "mino-ui/blocks/RichTextBlock";

export interface RichTextProps extends Omit<RichTextBlockProps, "content"> {
  content?: PortableTextBlock[];
}

type TextStyleValue = {
  color?: string;

  size?: string;
};

type LinkValue = {
  href?: string;

  openInNewTab?: boolean;
};

type SupportedTextSize =
  | "inherit"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl";

type SupportedTextColor = "default" | "brand" | "secondary" | "inverse";

const TEXT_SIZES = new Set<SupportedTextSize>([
  "inherit",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
]);

const TEXT_COLORS = new Set<SupportedTextColor>([
  "default",
  "brand",
  "secondary",
  "inverse",
]);

function resolveTextSize(value: unknown): SupportedTextSize {
  return typeof value === "string" && TEXT_SIZES.has(value as SupportedTextSize)
    ? (value as SupportedTextSize)
    : "inherit";
}

function resolveTextColor(value: unknown): SupportedTextColor {
  return typeof value === "string" &&
    TEXT_COLORS.has(value as SupportedTextColor)
    ? (value as SupportedTextColor)
    : "default";
}

const portableTextComponents = {
  block: {
    normal: ({ children }: { children?: ReactNode }) => (
      <Text size="md">{children}</Text>
    ),

    h1: ({ children }: { children?: ReactNode }) => (
      <Heading level={1} size="3xl">
        {children}
      </Heading>
    ),

    h2: ({ children }: { children?: ReactNode }) => (
      <Heading level={2} size="2xl">
        {children}
      </Heading>
    ),

    h3: ({ children }: { children?: ReactNode }) => (
      <Heading level={3} size="xl">
        {children}
      </Heading>
    ),

    h4: ({ children }: { children?: ReactNode }) => (
      <Heading level={4} size="lg">
        {children}
      </Heading>
    ),

    h5: ({ children }: { children?: ReactNode }) => (
      <Heading level={5} size="md">
        {children}
      </Heading>
    ),

    h6: ({ children }: { children?: ReactNode }) => (
      <Heading level={6} size="sm">
        {children}
      </Heading>
    ),

    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote>{children}</blockquote>
    ),
  },

  list: {
    bullet: ({ children }: { children?: ReactNode }) => <ul>{children}</ul>,

    number: ({ children }: { children?: ReactNode }) => <ol>{children}</ol>,
  },

  listItem: {
    bullet: ({ children }: { children?: ReactNode }) => <li>{children}</li>,

    number: ({ children }: { children?: ReactNode }) => <li>{children}</li>,
  },

  marks: {
    strong: ({ children }: { children?: ReactNode }) => (
      <strong>{children}</strong>
    ),

    em: ({ children }: { children?: ReactNode }) => <em>{children}</em>,

    textStyle: ({
      children,
      value,
    }: {
      children?: ReactNode;

      value?: TextStyleValue;
    }) => (
      <Text
        as="span"
        size={resolveTextSize(value?.size)}
        color={resolveTextColor(value?.color)}
      >
        {children}
      </Text>
    ),

    link: ({
      children,
      value,
    }: {
      children?: ReactNode;

      value?: LinkValue;
    }) => {
      const href = value?.href;
      if (!isSafeContentHref(href)) return <>{children}</>;

      const newTab = value?.openInNewTab === true;

      return (
        <RichTextLink href={href} openInNewTab={newTab}>
          {children}
        </RichTextLink>
      );
    },
  },
};

export function RichText({ content = [], ...props }: RichTextProps) {
  return (
    <RichTextBlock
      {...props}
      content={
        content.length > 0 ? (
          <PortableText value={content} components={portableTextComponents} />
        ) : null
      }
    />
  );
}
