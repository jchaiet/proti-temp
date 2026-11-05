import {describe, expect, it} from 'vitest'

import {navigationHeaderType} from '../navigationHeaderType'
import {navigationItemType} from '../../objects/navigationItemType'
import {
  navigationMegaMenuType,
  navigationMegaContentSectionType,
  navigationMegaFeatureSectionType,
  navigationMegaTileType,
  navigationMegaCardType,
  navigationMegaCategoryType,
  navigationMegaLinksSectionType,
  navigationMegaTilesSectionType,
  navigationMegaExplorerSectionType,
} from '../../objects/navigationMegaMenuTypes'

type Field = {
  name?: string
  type?: string
  of?: Array<{type?: string}>
  options?: {list?: Array<{value?: string}>}
  hidden?: (context: {parent?: {mode?: string}}) => boolean
  initialValue?: unknown
  validation?: unknown
}

function field(schema: {fields?: unknown}, name: string): Field {
  const result = ((schema.fields ?? []) as Field[]).find((item) => item.name === name)
  if (!result) throw new Error(`Missing schema field: ${name}`)
  return result
}

type RecorderRule = {
  skip: () => RecorderRule
  required: () => RecorderRule
  integer: () => RecorderRule
  min: (value: number) => RecorderRule
  max: (value: number) => RecorderRule
  custom: (validator: unknown) => RecorderRule
}

function validationCalls(schema: {validation?: unknown}, hidden: boolean): string[] {
  const calls: string[] = []
  const rule: RecorderRule = {
    skip: () => {
      calls.push('skip')
      return rule
    },
    required: () => {
      calls.push('required')
      return rule
    },
    integer: () => {
      calls.push('integer')
      return rule
    },
    min: () => {
      calls.push('min')
      return rule
    },
    max: () => {
      calls.push('max')
      return rule
    },
    custom: () => {
      calls.push('custom')
      return rule
    },
  }

  const validation = schema.validation as
    ((rule: RecorderRule, context: {hidden: boolean}) => unknown) | undefined

  if (!validation) throw new Error('Missing schema validation')
  validation(rule, {hidden})
  return calls
}

describe('Header Mega Menu authoring', () => {
  it('uses navigationItem for Header Primary Navigation', () => {
    expect(field(navigationHeaderType, 'items').of?.map((item) => item.type)).toContain(
      'navigationItem',
    )
  })

  it('allows top-level Header items to select Mega Menu', () => {
    expect(field(navigationItemType, 'mode').options?.list?.map((item) => item.value)).toContain(
      'mega',
    )
    expect(field(navigationItemType, 'megaMenu').type).toBe('navigationMegaMenu')
  })

  it('defaults to a standard link and hides Mega Menu unless explicitly selected', () => {
    const mode = field(navigationItemType, 'mode')
    const megaMenu = field(navigationItemType, 'megaMenu')

    expect(mode.initialValue).toBe('link')
    expect(mode.validation).toBeUndefined()
    expect(megaMenu.hidden?.({parent: {mode: 'link'}})).toBe(true)
    expect(megaMenu.hidden?.({parent: {mode: 'dropdown'}})).toBe(true)
    expect(megaMenu.hidden?.({parent: {}})).toBe(true)
    expect(megaMenu.hidden?.({parent: {mode: 'mega'}})).toBe(false)
    expect(validationCalls(field(navigationItemType, 'children'), true)).toEqual(['skip'])
    expect(validationCalls(field(navigationItemType, 'children'), false)).toEqual(['max'])
  })

  it('skips Mega Menu validations when the menu is hidden by the navigation mode', () => {
    const schemas = [
      navigationMegaMenuType,
      navigationMegaTileType,
      navigationMegaCardType,
      navigationMegaCategoryType,
      navigationMegaLinksSectionType,
      navigationMegaTilesSectionType,
      navigationMegaContentSectionType,
      navigationMegaExplorerSectionType,
      navigationMegaFeatureSectionType,
    ]

    for (const schema of schemas) {
      for (const entry of (schema.fields ?? []) as Field[]) {
        if (!entry.validation) continue
        expect(
          validationCalls(entry, true),
          `${schema.name}.${entry.name} should not validate a hidden Mega Menu`,
        ).toEqual(['skip'])
      }
    }

    expect(validationCalls(navigationMegaMenuType, true)).toEqual(['skip'])
  })

  it('retains required sections and layout validation when Mega Menu is visible', () => {
    expect(validationCalls(field(navigationMegaMenuType, 'sections'), false)).toEqual([
      'required',
      'min',
      'max',
    ])
    expect(validationCalls(field(navigationMegaMenuType, 'columns'), false)).toEqual([
      'required',
      'integer',
      'min',
      'max',
    ])
    expect(validationCalls(navigationMegaMenuType, false)).toEqual(['custom'])
  })

  it('makes mixed links, tiles, cards and Featured styles available within the Mega Menu', () => {
    expect(field(navigationMegaMenuType, 'sections').of?.map((item) => item.type)).toContain(
      'navigationMegaContentSection',
    )
    expect(field(navigationMegaContentSectionType, 'items').of?.map((item) => item.type)).toEqual([
      'navigationSubItem',
      'navigationMegaTile',
      'navigationMegaCard',
    ])
    expect(
      field(navigationMegaFeatureSectionType, 'presentation').options?.list?.map(
        (item) => item.value,
      ),
    ).toEqual(['tile', 'card'])
  })
})
