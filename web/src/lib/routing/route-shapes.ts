export function getAuthorSlug(segments: string[]): string | null {
  if (segments.length !== 2 || segments[0] !== "authors") {
    return null;
  }

  return segments[1] || null;
}

export function getBlogSlug(segments: string[]): string | null {
  if (segments.length !== 2 || segments[0] !== "blog") {
    return null;
  }

  return segments[1] || null;
}

export function getBlogTaxonomySegments(segments: string[]): string[] | null {
  if (segments.length < 3 || segments[0] !== "blog") {
    return null;
  }

  return segments.slice(1);
}

export function isReservedPageRoute(segments: string[]): boolean {
  /*
   * Authored Pages such as /search, /about, and /contact are intentionally not
   * reserved here. Only application-owned content route shapes are excluded
   * from normal Page resolution.
   */
  return Boolean(
    getAuthorSlug(segments) ||
    getBlogSlug(segments) ||
    getBlogTaxonomySegments(segments),
  );
}
