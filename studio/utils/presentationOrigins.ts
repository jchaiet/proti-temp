/**
 * Sanity Presentation's preview messaging origins.
 * Wildcard localhost support is a development convenience, not a production policy.
 */
export function presentationAllowedOrigins(previewUrl: string, production: boolean): string[] {
  const previewOrigin = new URL(previewUrl).origin

  return Array.from(new Set(production ? [previewOrigin] : ['http://localhost:*', previewOrigin]))
}
