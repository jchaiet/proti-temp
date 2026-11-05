import { REVALIDATION_DOCUMENT_TYPES } from "./types";

const TYPE_FILTER = REVALIDATION_DOCUMENT_TYPES.map(
  (type) => `\"${type}\"`,
).join(", ");

/**
 * Sanity document-webhook filter.
 *
 * Leave Include drafts and Include versions disabled. Sanity document
 * webhooks then fire for published create/update/delete events only.
 */
export const SANITY_REVALIDATION_WEBHOOK_FILTER = `
  coalesce(after()._type, before()._type) in [${TYPE_FILTER}]
`;

const SNAPSHOT_PROJECTION = `{
  _id,
  _type,

  \"siteId\": select(
    _type == \"site\" => _id,
    site._ref
  ),

  locale,

  \"slug\": select(
    _type == \"page\" => slug,
    _type in [\"blog\", \"author\", \"taxonomy\"] => slug.current
  ),

  \"sourcePath\": sourcePath,
  \"parentId\": parent._ref,
  isHomepage,
  key,

  defaultLocale,
  locales[]{code},

  \"authorId\": author._ref,
  \"taxonomyIds\": taxonomy[]._ref
}`;

/**
 * Projection to paste into the Sanity webhook configuration.
 *
 * Keeping both states lets the application invalidate old and new URLs when
 * a route-defining field such as slug, parent, locale, or defaultLocale is
 * changed. It also makes delete events revalidatable after the document no
 * longer exists in the published dataset.
 */
export const SANITY_REVALIDATION_WEBHOOK_PROJECTION = `{
  \"before\": before()${SNAPSHOT_PROJECTION},
  \"after\": after()${SNAPSHOT_PROJECTION}
}`;
