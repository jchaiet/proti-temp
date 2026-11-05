import type {
  CmsImage,
  CmsNavigationFooter,
  CmsNavigationHeader,
  CmsNavigationLogo,
  CmsNavigationOverride,
  CmsNavigationSet,
} from "@/cms/types";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import { sanityFetch } from "@/sanity/fetch";

import { NAVIGATION_SET_QUERY } from "@/sanity/queries/navigation";

type RawNavigationLogo = Omit<
  CmsNavigationLogo,
  "customUrl" | "customAlt" | "siteUrl" | "siteAlt"
> & {
  customImage?: CmsImage;
  siteImage?: CmsImage;
};

type RawNavigationHeader = Omit<CmsNavigationHeader, "logo"> & {
  logo: RawNavigationLogo;
};

type RawNavigationFooter = Omit<CmsNavigationFooter, "logo"> & {
  logo: RawNavigationLogo;
};

type RawNavigationSet = Omit<CmsNavigationSet, "header" | "footer"> & {
  header?: RawNavigationHeader;
  footer?: RawNavigationFooter;
};

function resolveLogo(logo: RawNavigationLogo): CmsNavigationLogo {
  return {
    mode: logo.mode,

    customUrl: resolveSanityImagePreset(logo.customImage, "logo"),
    customAlt: logo.customImage?.alt ?? "",

    siteUrl: resolveSanityImagePreset(logo.siteImage, "logo"),
    siteAlt: logo.siteImage?.alt ?? logo.siteName ?? "",

    siteName: logo.siteName,
  };
}

function mapNavigationSet(record: RawNavigationSet): CmsNavigationSet {
  return {
    ...record,

    header: record.header
      ? {
          ...record.header,
          logo: resolveLogo(record.header.logo),
        }
      : undefined,

    footer: record.footer
      ? {
          ...record.footer,
          logo: resolveLogo(record.footer.logo),
        }
      : undefined,
  };
}

export interface ResolveNavigationOptions {
  siteId: string;
  locale: string;

  override?: CmsNavigationOverride;

  visualEditing?: boolean;
}

function cleanId(id?: string): string | undefined {
  if (!id) {
    return undefined;
  }

  return id.replace(/^drafts\./, "");
}

/**
 * Resolves the Navigation Set for the current request.
 *
 * - undefined / inherit:
 *   Navigation Set selected on the Site for this Locale.
 *
 * - custom:
 *   explicitly selected Navigation Set
 *
 * - none:
 *   no Header or Footer
 */
export async function resolveNavigation({
  siteId,
  locale,
  override,
  visualEditing = false,
}: ResolveNavigationOptions): Promise<CmsNavigationSet | null> {
  if (!siteId || !locale) {
    return null;
  }

  const mode = override?.mode ?? "inherit";

  if (mode === "none") {
    return null;
  }

  const navigationSetId =
    mode === "custom" ? cleanId(override?.navigationSet?._ref) : undefined;

  /*
   * Do not silently fall back to the default if an author
   * explicitly chose Custom but the selected set is missing.
   */
  if (mode === "custom" && !navigationSetId) {
    return null;
  }

  const record = await sanityFetch<RawNavigationSet | null>(
    NAVIGATION_SET_QUERY,
    {
      siteId,
      locale,

      /*
       * Sanity query parameters should not receive undefined.
       * `defined(null)` is false in the query, which selects the
       * Site-owned default for this Locale.
       */
      navigationSetId: navigationSetId ?? null,
    },
    { visualEditing },
  );

  return record ? mapNavigationSet(record) : null;
}
