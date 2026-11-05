export const REDIRECT_BY_SOURCE_QUERY = `
  *[
    _type == "redirect" &&
    site._ref == $siteId &&
    locale == $locale &&
    enabled != false &&
    sourcePath in $sourcePaths
  ]{
    _id,
    sourcePath,
    redirectType,
    preserveQuery,
    enabled,

    destination {
      type,
      "internalPageId": internalPage._ref,
      path,
      externalUrl
    }
  }
`;
