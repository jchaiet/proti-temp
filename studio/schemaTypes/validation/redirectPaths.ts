export function normalizeRedirectPath(value?: string): string {
  if (!value) return ''

  const trimmed = value.trim()

  return trimmed === '/' ? '/' : trimmed.replace(/\/+$/, '')
}

export function getRedirectPathVariants(value?: string): string[] {
  const normalized = normalizeRedirectPath(value)

  if (!normalized) return []
  if (normalized === '/') return ['/']

  return [normalized, `${normalized}/`]
}
