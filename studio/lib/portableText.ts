type PortableTextSpan = {
  _type?: string
  text?: string
}

type PortableTextBlock = {
  _type?: string
  children?: PortableTextSpan[]
}

export function portableTextToPlainText(value: unknown[] | undefined): string {
  if (!Array.isArray(value)) {
    return ''
  }

  return value
    .filter(
      (block): block is PortableTextBlock =>
        typeof block === 'object' && block !== null && '_type' in block && block._type === 'block',
    )
    .map((block) =>
      Array.isArray(block.children)
        ? block.children
            .map((child) => (typeof child?.text === 'string' ? child.text : ''))
            .join('')
        : '',
    )
    .join('\n')
    .trim()
}
