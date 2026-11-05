import {describe, expect, it} from 'vitest'

import {validateNavigationMegaLayout} from '../navigationMega'
import {validateNavigationItemDestination} from '../linkDestination'

describe('Mega Menu authoring contract', () => {
  it('accepts a two-column layout with a full-width middle tile', () => {
    expect(
      validateNavigationMegaLayout({
        columns: 4,
        sections: [
          {
            _type: 'navigationMegaTilesSection',
            span: 3,
            columns: 2,
            items: [{span: 1}, {span: 1}, {span: 2}, {span: 1}, {span: 1}],
          },
        ],
      }),
    ).toBe(true)
  })

  it('rejects a tile spanning more columns than its own section', () => {
    expect(
      validateNavigationMegaLayout({
        columns: 4,
        sections: [{_type: 'navigationMegaTilesSection', columns: 2, items: [{span: 3}]}],
      }),
    ).toContain('Tile span')
  })

  it('rejects sections wider than the outer grid', () => {
    expect(validateNavigationMegaLayout({columns: 2, sections: [{span: 3}]})).toContain(
      'Section span',
    )
  })

  it('requires at least one section and valid grid columns', () => {
    expect(validateNavigationMegaLayout({columns: 4, sections: []})).toContain('at least one')
    expect(validateNavigationMegaLayout({columns: 6, sections: [{}]})).toContain('between 2 and 5')
  })

  it('keeps legacy links and dropdowns valid', () => {
    expect(validateNavigationItemDestination({link: {type: 'external'}})).toBe(true)
    expect(validateNavigationItemDestination({children: [{}]})).toBe(true)
  })

  it('requires the destination appropriate to an explicit item mode', () => {
    expect(validateNavigationItemDestination({mode: 'link', children: [{}]})).toContain('Link')
    expect(
      validateNavigationItemDestination({mode: 'dropdown', link: {type: 'external'}}),
    ).toContain('Dropdown')
    expect(validateNavigationItemDestination({mode: 'mega', megaMenu: {sections: [{}]}})).toBe(true)
    expect(validateNavigationItemDestination({mode: 'mega', megaMenu: {sections: []}})).toContain(
      'Mega Menu',
    )
  })

  it('does not require Mega Menu settings for a standard link or dropdown', () => {
    expect(
      validateNavigationItemDestination({
        mode: 'link',
        link: {type: 'external'},
        megaMenu: {columns: 4},
      }),
    ).toBe(true)
    expect(
      validateNavigationItemDestination({
        mode: 'dropdown',
        children: [{_key: 'item-1'}],
        megaMenu: {columns: 4, sections: []},
      }),
    ).toBe(true)
    expect(
      validateNavigationItemDestination({
        link: {type: 'internal'},
        megaMenu: {sections: []},
      }),
    ).toBe(true)
  })

  it('validates tile and card spans in mixed content against the local grid', () => {
    expect(
      validateNavigationMegaLayout({
        columns: 4,
        sections: [
          {
            _type: 'navigationMegaContentSection',
            span: 3,
            columns: 2,
            items: [
              {_type: 'navigationMegaTile', span: 2},
              {_type: 'navigationMegaCard', span: 1},
            ],
          },
        ],
      }),
    ).toBe(true)
    expect(
      validateNavigationMegaLayout({
        columns: 4,
        sections: [
          {
            _type: 'navigationMegaContentSection',
            columns: 2,
            items: [{_type: 'navigationMegaCard', span: 3}],
          },
        ],
      }),
    ).toContain('Tile span')
  })
})
