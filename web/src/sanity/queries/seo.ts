import { IMAGE_FRAGMENT } from "@/sanity/fragments/image";

export const SITE_SEO_QUERY = `
  *[
    _type == "site" &&
    _id == $siteId
  ][0]{
    _id,
    name,
    domains,
    canonicalDomain,
    defaultLocale,

    "defaults": seoDefaults[
      locale == $locale
    ][0]{
      locale,

      siteTitle,
      titleTemplate,

      metaDescription,

      socialImage {
        ${IMAGE_FRAGMENT}
      },

      indexing,
      following
    }
  }
`;
