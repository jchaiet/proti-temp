export const MAX_TAXONOMY_PATH_DEPTH = 50

export type TaxonomyPathNode = {
  _id: string
  parentId?: string
  slug?: string
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, '') ?? ''
}

export function buildTaxonomyPath(
  taxonomyId: string,
  nodes: TaxonomyPathNode[],
): string | undefined {
  const nodeById = new Map<string, TaxonomyPathNode>()

  for (const node of nodes) {
    const id = cleanId(node._id)

    if (!id) {
      continue
    }

    nodeById.set(id, {
      ...node,
      _id: id,
      parentId: cleanId(node.parentId),
    })
  }

  const segments: string[] = []

  const visited = new Set<string>()

  let currentId = cleanId(taxonomyId)

  let depth = 0

  while (currentId && depth < MAX_TAXONOMY_PATH_DEPTH) {
    if (visited.has(currentId)) {
      return undefined
    }

    visited.add(currentId)

    const node = nodeById.get(currentId)

    if (!node) {
      return undefined
    }

    const slug = node.slug?.trim()

    if (!slug) {
      return undefined
    }

    segments.unshift(slug)

    currentId = cleanId(node.parentId)

    depth++
  }

  if (currentId || segments.length === 0) {
    return undefined
  }

  return segments.join('/')
}

export function createTaxonomyPreviewAncestorSelect(): Record<string, string> {
  const select: Record<string, string> = {}

  let parentPath = 'parent'

  for (let index = 0; index < MAX_TAXONOMY_PATH_DEPTH; index++) {
    select[`ancestorSlug${index}`] = `${parentPath}.slug.current`

    parentPath = `${parentPath}.parent`
  }

  return select
}

export function buildTaxonomyPreviewPath(
  slug: string | undefined,
  selection: Record<string, unknown>,
): string | undefined {
  const currentSlug = slug?.trim()

  if (!currentSlug) {
    return undefined
  }

  const ancestors: string[] = []

  for (let index = 0; index < MAX_TAXONOMY_PATH_DEPTH; index++) {
    const value = selection[`ancestorSlug${index}`]

    if (typeof value !== 'string' || !value.trim()) {
      break
    }

    ancestors.push(value.trim())
  }

  return [...ancestors.reverse(), currentSlug].join('/')
}
