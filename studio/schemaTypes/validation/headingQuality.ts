import type {ValidationContext} from 'sanity'

type PortableTextSpan = {
  text?: string
}

type PortableTextBlock = {
  _type?: string
  style?: string
  children?: PortableTextSpan[]
}

type SectionHeadingValue = {
  title?: unknown[]
  description?: unknown[]
}

type BuilderBlock = {
  _key?: string
  _type?: string
  heading?: SectionHeadingValue
  content?: unknown[]
  items?: Array<{
    _key?: string
    content?: unknown[]
  }>
}

type HeadingEntry = {
  level: number
  text: string
  source: string
}

type HeadingDocumentType = 'page' | 'blog'

const PLACEHOLDER_HEADINGS = new Set([
  'heading',
  'lorem ipsum',
  'placeholder',
  'page heading',
  'page title',
  'tbd',
  'test',
  'testing',
  'title',
  'todo',
  'untitled',
])

function portableTextToPlainText(value: unknown): string {
  if (!Array.isArray(value)) {
    return ''
  }

  return value
    .map((block) => {
      if (!block || typeof block !== 'object') {
        return ''
      }

      const children = (block as PortableTextBlock).children

      if (!Array.isArray(children)) {
        return ''
      }

      return children.map((child) => child?.text ?? '').join('')
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function portableTextHeadings(value: unknown, source: string): HeadingEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const headings: HeadingEntry[] = []

  value.forEach((block, index) => {
    if (!block || typeof block !== 'object') {
      return
    }

    const portableBlock = block as PortableTextBlock
    const style = portableBlock.style

    if (!style || !/^h[1-6]$/.test(style)) {
      return
    }

    const text = portableTextToPlainText([portableBlock])

    if (!text) {
      return
    }

    headings.push({
      level: Number(style.slice(1)),
      text,
      source: `${source} ${index + 1}`,
    })
  })

  return headings
}

function sectionHeadingEntries(
  heading: SectionHeadingValue | undefined,
  source: string,
): HeadingEntry[] {
  if (!heading) {
    return []
  }

  return [
    ...portableTextHeadings(heading.title, `${source} title`),
    ...portableTextHeadings(heading.description, `${source} description heading`),
  ]
}

function blockLabel(block: BuilderBlock, index: number): string {
  const labels: Record<string, string> = {
    accordionBlock: 'Accordion',
    carouselBlock: 'Carousel',
    contentBlock: 'Content',
    documentListBlock: 'Document List',
    formBlock: 'Form',
    gridBlock: 'Grid',
    heroBlock: 'Hero',
    pollBlock: 'Poll',
    richTextBlock: 'Rich Text',
    tabsBlock: 'Tabs',
  }

  return `${labels[block._type ?? ''] ?? block._type ?? 'Block'} block ${index + 1}`
}

function collectBlockHeadings(block: BuilderBlock, index: number): HeadingEntry[] {
  const source = blockLabel(block, index)

  /*
   * sectionHeading.title is Portable Text and its h1-h6 style is the actual
   * semantic heading rendered on the frontend. Do not infer a level from the
   * block type.
   */
  const entries = sectionHeadingEntries(block.heading, source)

  if (block._type === 'richTextBlock') {
    entries.push(...portableTextHeadings(block.content, `${source} content heading`))
  }

  if (block._type === 'tabsBlock' && Array.isArray(block.items)) {
    block.items.forEach((item, itemIndex) => {
      entries.push(
        ...portableTextHeadings(item?.content, `${source}, tab ${itemIndex + 1} content heading`),
      )
    })
  }

  return entries
}

function collectBuilderHeadings(sections: unknown): HeadingEntry[] {
  if (!Array.isArray(sections)) {
    return []
  }

  return sections.flatMap((section, index) => {
    if (!section || typeof section !== 'object') {
      return []
    }

    return collectBlockHeadings(section as BuilderBlock, index)
  })
}

function isPlaceholderHeading(text: string): boolean {
  return PLACEHOLDER_HEADINGS.has(text.trim().toLowerCase().replace(/\s+/g, ' '))
}

function describeHeading(entry: HeadingEntry): string {
  return `H${entry.level} "${entry.text}" (${entry.source})`
}

function findHierarchySkip(
  headings: HeadingEntry[],
): {previous: HeadingEntry; current: HeadingEntry} | null {
  for (let index = 1; index < headings.length; index++) {
    const previous = headings[index - 1]
    const current = headings[index]

    if (current.level > previous.level + 1) {
      return {
        previous,
        current,
      }
    }
  }

  return null
}

function buildHeadingWarning(
  documentType: HeadingDocumentType,
  sections: unknown,
  context: ValidationContext,
): true | string {
  const builderHeadings = collectBuilderHeadings(sections)

  const headings: HeadingEntry[] =
    documentType === 'blog'
      ? [
          {
            level: 1,
            text: typeof context.document?.title === 'string' ? context.document.title.trim() : '',
            source: 'Blog title',
          },
          ...builderHeadings,
        ].filter((entry) => Boolean(entry.text))
      : builderHeadings

  const warnings: string[] = []
  const h1Headings = headings.filter((heading) => heading.level === 1)

  if (documentType === 'page') {
    if (h1Headings.length === 0) {
      warnings.push('Page has no H1. Set exactly one section Title to Heading 1.')
    } else if (h1Headings.length > 1) {
      warnings.push(
        `Page has ${h1Headings.length} H1 headings. Use exactly one primary H1 and make supporting headings H2-H6.`,
      )
    }

    const firstH1Index = headings.findIndex((heading) => heading.level === 1)

    if (firstH1Index > 0) {
      warnings.push(
        `The first H1 appears after another heading: ${describeHeading(
          headings[firstH1Index],
        )}. The primary H1 should normally be the first rendered heading.`,
      )
    }
  } else {
    /*
     * BlogHero always renders the Blog document title as the page H1 before
     * the body builder. Studio validation therefore treats that title as the
     * primary H1 and only checks Blog Content for additional H1 headings.
     */
    const bodyH1s = builderHeadings.filter((heading) => heading.level === 1)

    if (bodyH1s.length > 0) {
      warnings.push(
        `Blog title already renders as H1. Blog Content adds ${bodyH1s.length} additional H1 heading${
          bodyH1s.length === 1 ? '' : 's'
        }; use H2-H6 in Blog Content instead.`,
      )
    }
  }

  const primaryH1 = h1Headings[0]

  if (primaryH1) {
    if (isPlaceholderHeading(primaryH1.text)) {
      warnings.push(
        `Primary H1 "${primaryH1.text}" looks like placeholder text. Use a descriptive page/article heading.`,
      )
    } else if (primaryH1.text.replace(/\s+/g, '').length <= 1) {
      warnings.push(
        `Primary H1 "${primaryH1.text}" is extremely short. Verify that it clearly describes the page.`,
      )
    }
  }

  const hierarchySkip = findHierarchySkip(headings)

  if (hierarchySkip) {
    warnings.push(
      `Heading hierarchy skips from ${describeHeading(hierarchySkip.previous)} to ${describeHeading(
        hierarchySkip.current,
      )}. Avoid skipping heading levels when possible.`,
    )
  }

  return warnings.length > 0 ? warnings.join(' ') : true
}

export function validatePageHeadingQuality(
  sections: unknown,
  context: ValidationContext,
): true | string {
  return buildHeadingWarning('page', sections, context)
}

export function validateBlogHeadingQuality(
  sections: unknown,
  context: ValidationContext,
): true | string {
  return buildHeadingWarning('blog', sections, context)
}

export function validateSingletonHeadingQuality(component: unknown): true | string {
  const headings = collectBuilderHeadings(component)
  const h1Headings = headings.filter((heading) => heading.level === 1)

  if (h1Headings.length === 0) {
    return true
  }

  return `Singleton components are reusable and should not contain H1 headings. Found ${h1Headings
    .map((heading) => describeHeading(heading))
    .join(', ')}. Keep the Page or Blog primary H1 outside the Singleton.`
}

export function validateAuthorBioHeadingQuality(value: unknown): true | string {
  const headings = portableTextHeadings(value, 'Author Bio heading')

  if (headings.length === 0) {
    return true
  }

  const warnings: string[] = []
  const h1Headings = headings.filter((heading) => heading.level === 1)

  if (h1Headings.length > 0) {
    warnings.push(
      `Author name already renders as the page H1. Author Bio contains ${h1Headings.length} additional H1 heading${
        h1Headings.length === 1 ? '' : 's'
      }; use H2-H6 in the Bio instead.`,
    )
  }

  const hierarchy = findHierarchySkip([
    {
      level: 1,
      text: 'Author name',
      source: 'Author profile',
    },
    ...headings,
  ])

  if (hierarchy) {
    warnings.push(
      `Author Bio heading hierarchy skips from ${describeHeading(
        hierarchy.previous,
      )} to ${describeHeading(hierarchy.current)}. Start Bio sections at H2 and avoid skipping heading levels when possible.`,
    )
  }

  return warnings.length > 0 ? warnings.join(' ') : true
}
