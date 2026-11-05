/**
 * Shared Sanity srcSet width ladders.
 *
 * Keep the same candidate width across image-consuming CMS blocks so that the
 * browser can reuse an identical Sanity CDN URL for the same image and crop.
 * In particular, avoid a separate 800w candidate next to the hero's 768w.
 *
 * These only govern srcSet candidates. They do not change a component's
 * fallback image URL, authored crop/hotspot, or CSS `sizes` expression.
 */
export const SANITY_RESPONSIVE_WIDTHS = {
  hero: [480, 768, 960, 1280, 1600, 1920],

  standard: [320, 480, 640, 768, 960, 1200],

  content: [160, 240, 320, 480, 640, 768, 960, 1200, 1600],
} as const;
