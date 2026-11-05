import { HeroBlock, type HeroProps } from "mino-ui/blocks/HeroBlock";

import { HeroActions } from "./HeroActions";

/**
 * Render the Hero's layout, rich text, and LCP image on the server.
 * Only interactive CTA buttons cross the client boundary.
 */
export function Hero({ ctas = [], ...props }: HeroProps) {
  return (
    <HeroBlock
      {...props}
      ctaContent={ctas.length > 0 ? <HeroActions ctas={ctas} /> : undefined}
    />
  );
}
