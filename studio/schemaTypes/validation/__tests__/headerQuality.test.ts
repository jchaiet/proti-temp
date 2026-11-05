import {describe, expect, it} from 'vitest'

import {validateAuthorBioHeadingQuality} from '../headingQuality'

function heading(level: 1 | 2 | 3 | 4 | 5 | 6, text: string) {
  return {
    _type: 'block',
    style: `h${level}`,
    children: [
      {
        _type: 'span',
        text,
      },
    ],
  }
}

describe('validateAuthorBioHeadingQuality', () => {
  it('allows body copy without headings', () => {
    expect(
      validateAuthorBioHeadingQuality([
        {
          _type: 'block',
          style: 'normal',
          children: [{_type: 'span', text: 'Author biography'}],
        },
      ]),
    ).toBe(true)
  })

  it('allows an H2 as the first Author Bio heading', () => {
    expect(validateAuthorBioHeadingQuality([heading(2, 'Background')])).toBe(true)
  })

  it('warns when Author Bio adds another H1', () => {
    expect(validateAuthorBioHeadingQuality([heading(1, 'Biography')])).toContain(
      'Author name already renders as the page H1',
    )
  })

  it('warns when the first Author Bio heading skips directly to H3', () => {
    expect(validateAuthorBioHeadingQuality([heading(3, 'Background')])).toContain(
      'Start Bio sections at H2',
    )
  })
})
