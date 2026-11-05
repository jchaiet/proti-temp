"use client";

import type { ReactNode } from "react";

import { Button } from "mino-ui/core/Button";

export interface RichTextLinkProps {
  href: string;
  openInNewTab?: boolean;
  children?: ReactNode;
}

/**
 * Keep interactive Mino link behavior out of the server-rendered
 * Portable Text tree. Links remain keyboard accessible and retain
 * their styling and existing new-tab security attributes.
 */
export function RichTextLink({
  href,
  openInNewTab = false,
  children,
}: RichTextLinkProps) {
  return (
    <Button
      as="a"
      href={href}
      variant="link"
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
    >
      {children}
    </Button>
  );
}
