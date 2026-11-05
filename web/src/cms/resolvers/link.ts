import { cache } from "react";

import type { CmsLink } from "../types";

import { getPageUrl } from "@/sanity/queries/page-url";
import { isSafeWebUrl } from "@/lib/security/urls";

// Request-scoped promise deduplication for repeated header/footer/CTA links.
// Unlike module-level caching, this does not retain stale URLs across requests.
const getPageUrlCached = cache(getPageUrl);

export type ResolvedLink = {
  href: string;
  target?: "_blank";
  rel?: string;
};

export async function resolveLink(
  link: CmsLink | null | undefined,
): Promise<ResolvedLink | undefined> {
  // A reference or Link object can be absent in legacy/incomplete CMS content.
  // Treat it as an unavailable destination rather than crashing the page.
  switch (link?.type) {
    case "none":
      return undefined;

    case "internal": {
      if (!link.internalPage?._ref) {
        return undefined;
      }

      const href = await getPageUrlCached(link.internalPage._ref);

      if (!href) {
        return undefined;
      }

      return {
        href,
      };
    }

    case "external": {
      if (!isSafeWebUrl(link.externalUrl)) {
        return undefined;
      }

      return {
        href: link.externalUrl,

        ...(link.openInNewTab
          ? {
              target: "_blank" as const,

              rel: "noopener noreferrer",
            }
          : {}),
      };
    }

    case "email": {
      if (!link.email) {
        return undefined;
      }

      return {
        href: `mailto:${link.email}`,
      };
    }

    case "phone": {
      if (!link.phone) {
        return undefined;
      }

      const phone = link.phone.replace(/[^\d+]/g, "");

      return {
        href: `tel:${phone}`,
      };
    }

    case "anchor": {
      if (!link.anchor) {
        return undefined;
      }

      const anchor = link.anchor.replace(/^#/, "");

      return {
        href: `#${anchor}`,
      };
    }

    default:
      return undefined;
  }
}
