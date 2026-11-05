const DRAFTS_PREFIX = 'drafts.'

export function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, '') ?? ''
}

export function draftId(id?: string): string {
  const clean = cleanId(id)

  return clean ? `${DRAFTS_PREFIX}${clean}` : ''
}

export function documentIds(id?: string): string[] {
  const clean = cleanId(id)

  return clean ? [clean, draftId(clean)] : []
}

export function isDraftId(id?: string): boolean {
  return Boolean(id?.startsWith(DRAFTS_PREFIX))
}

export function isPublishedId(id: string): boolean {
  return !isDraftId(id)
}
