export const SEARCH_SITE_BY_HOST_QUERY = `
  *[
    _type == "site" &&
    (
      $host in domains ||
      $hostname in domains
    )
  ][0]{
    _id,
    name,
    domains,
    canonicalDomain,
    defaultLocale,

    locales[]{
      code
    },

    seoDefaults[]{
      locale,
      indexing
    }
  }
`;

export const SITEMAP_PAGES_QUERY = `
  *[
    _type == "page" &&
    site._ref == $siteId
  ]{
    _id,
    _updatedAt,

    locale,
    slug,
    isHomepage,

    "parentId": parent._ref,

    seo {
      canonicalUrl,
      indexing
    }
  }
`;

export const SITEMAP_BLOGS_QUERY = `
  *[
    _type == "blog" &&
    site._ref == $siteId
  ]{
    _id,
    _updatedAt,

    lastModifiedAt,

    locale,

    "slug": slug.current,

    seo {
      canonicalUrl,
      indexing
    }
  }
`;

export const SITEMAP_TAXONOMY_QUERY = `
  *[
    _type == "taxonomy" &&
    site._ref == $siteId
  ]{
    _id,
    _updatedAt,

    "slug": slug.current,
    "parentId": parent._ref
  }
`;

export const SITEMAP_AUTHORS_QUERY = `
  *[
    _type == "author" &&
    site._ref == $siteId
  ]{
    _id,
    _updatedAt,

    "slug": slug.current,

    translations[]{
      locale,
      name
    }
  }
`;
