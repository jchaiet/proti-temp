import {describe, expect, it} from 'vitest'

import {ctaType} from '../ctaType'
import {linkType} from '../linkType'

type FieldLike = {
  name?: string
  initialValue?: unknown
  hidden?: (context: {parent?: Record<string, unknown>}) => boolean
  options?: {
    list?: Array<{title?: string; value?: string}>
  }
  to?: Array<{type?: string}>
}

function field(schema: {fields?: unknown}, name: string): FieldLike | undefined {
  return ((schema.fields ?? []) as FieldLike[]).find((candidate) => candidate.name === name)
}

describe('CTA modal authoring contract', () => {
  it('removes No Link from new shared Link authoring', () => {
    const typeField = field(linkType, 'type')
    const values = typeField?.options?.list?.map((option) => option.value) ?? []

    expect(values).toEqual(['internal', 'external', 'email', 'phone', 'anchor'])
    expect(typeField?.initialValue).toBe('internal')
  })

  it('adds an explicit Link or Open Modal CTA action selector', () => {
    const actionType = field(ctaType, 'actionType')

    expect(actionType?.initialValue).toBe('link')
    expect(actionType?.options?.list?.map((option) => option.value)).toEqual(['link', 'modal'])
  })

  it('keeps Modal selection CTA-scoped rather than adding Modal to every Link', () => {
    const modal = field(ctaType, 'modal')
    const linkTypes = field(linkType, 'type')?.options?.list?.map((option) => option.value) ?? []

    expect(modal?.to?.map((candidate) => candidate.type)).toContain('modal')
    expect(linkTypes).not.toContain('modal')
  })

  it('switches the Link and Modal fields based on CTA actionType', () => {
    const link = field(ctaType, 'link')
    const modal = field(ctaType, 'modal')

    expect(link?.hidden?.({parent: {actionType: 'link'}})).toBe(false)
    expect(link?.hidden?.({parent: {actionType: 'modal'}})).toBe(true)
    expect(modal?.hidden?.({parent: {actionType: 'link'}})).toBe(true)
    expect(modal?.hidden?.({parent: {actionType: 'modal'}})).toBe(false)
  })
})
