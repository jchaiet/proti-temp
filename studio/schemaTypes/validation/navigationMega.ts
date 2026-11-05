type MegaTile = {span?: number}
type MegaSection = {
  _type?: string
  span?: number
  columns?: number
  items?: MegaTile[]
}
type MegaMenu = {columns?: number; sections?: MegaSection[]}

/** Validate spans against the actual Mino UI Navigation grid contract. */
export function validateNavigationMegaLayout(value: unknown): true | string {
  if (!value) return true
  const menu = value as MegaMenu
  const columns = menu.columns ?? 4
  if (![2, 3, 4, 5].includes(columns)) return 'Mega Menu columns must be between 2 and 5.'
  if (!Array.isArray(menu.sections) || menu.sections.length === 0) {
    return 'Add at least one Mega Menu section.'
  }

  for (const section of menu.sections) {
    const sectionSpan = section.span ?? 1
    if (!Number.isInteger(sectionSpan) || sectionSpan < 1 || sectionSpan > Math.min(columns, 4)) {
      return `Section span must be between 1 and ${Math.min(columns, 4)}.`
    }
    if (
      section._type !== 'navigationMegaTilesSection' &&
      section._type !== 'navigationMegaContentSection'
    )
      continue
    const tileColumns = section.columns ?? 2
    if (![1, 2, 3].includes(tileColumns)) return 'Tile grid columns must be between 1 and 3.'
    for (const tile of section.items ?? []) {
      const span = tile.span ?? 1
      if (!Number.isInteger(span) || span < 1 || span > tileColumns) {
        return `Tile span must be between 1 and ${tileColumns} for this section.`
      }
    }
  }
  return true
}
