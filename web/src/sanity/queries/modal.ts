import type { CmsModal } from "@/cms/types";

import { sanityFetch } from "@/sanity/fetch";

import {
  ACCORDION_BLOCK_FRAGMENT,
  CONTENT_BLOCK_FRAGMENT,
  FORM_BLOCK_FRAGMENT,
  RICH_TEXT_BLOCK_FRAGMENT,
  TABS_BLOCK_FRAGMENT,
} from "@/sanity/fragments";

export const MODALS_QUERY = `
  *[
    _type == "modal" &&
    site._ref == $siteId &&
    locale == $locale
  ] | order(title asc) {
    _id,
    title,
    key,
    modalTitle,
    description,
    size,

    "siteId": site._ref,
    locale,

    content[] {
      _key,
      _type,

      ${CONTENT_BLOCK_FRAGMENT},

      ${RICH_TEXT_BLOCK_FRAGMENT},

      ${ACCORDION_BLOCK_FRAGMENT},

      ${TABS_BLOCK_FRAGMENT},

      ${FORM_BLOCK_FRAGMENT}
    }
  }
`;

export interface GetModalsOptions {
  siteId: string;
  locale: string;
  visualEditing?: boolean;
}

export async function getModals({
  siteId,
  locale,
  visualEditing = false,
}: GetModalsOptions): Promise<CmsModal[]> {
  if (!siteId || !locale) {
    return [];
  }

  return sanityFetch<CmsModal[]>(
    MODALS_QUERY,
    {
      siteId,
      locale,
    },
    { visualEditing },
  );
}
