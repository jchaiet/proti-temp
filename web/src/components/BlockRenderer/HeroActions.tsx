"use client";

import { Button, type ButtonProps } from "mino-ui/core/Button";

/** Preserve Mino's modal, scroll-target, link, icon, and button behaviors. */
export function HeroActions({ ctas }: { ctas: ButtonProps[] }) {
  return (
    <>
      {ctas.map((cta, index) => (
        <Button key={`hero-cta-${index}`} {...cta} />
      ))}
    </>
  );
}
