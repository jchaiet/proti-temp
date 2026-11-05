import {describe, expect, it} from 'vitest'

import {ctaGroupType} from '../ctaGroupType'

interface SchemaFieldLike {
  name?: string
  type?: string
  initialValue?: unknown
  hidden?: (context: {parent?: Record<string, unknown>}) => boolean
  of?: Array<{
    type?: string
  }>
  options?: {
    list?: Array<{
      title?: string
      value?: string
    }>
  }
}

function getField(name: string): SchemaFieldLike | undefined {
  return (ctaGroupType.fields as unknown as SchemaFieldLike[]).find((field) => field.name === name)
}

describe('CTA Group schema', () => {
  it('owns CTA items, alignment, and mobile stacking in one reusable object', () => {
    expect(getField('items')?.type).toBe('array')
    expect(getField('items')?.of?.map((member) => member.type)).toContain('cta')

    expect(getField('alignment')?.options?.list?.map((item) => item.value)).toEqual([
      'left',
      'center',
      'right',
    ])

    expect(getField('stackOnMobile')?.type).toBe('boolean')
    expect(getField('stackOnMobile')?.initialValue).toBe(true)
  })

  it('hides layout settings until the group contains at least one CTA', () => {
    const alignment = getField('alignment')
    const stackOnMobile = getField('stackOnMobile')

    expect(alignment?.hidden?.({parent: {items: []}})).toBe(true)
    expect(stackOnMobile?.hidden?.({parent: {items: []}})).toBe(true)

    expect(
      alignment?.hidden?.({
        parent: {
          items: [{_type: 'cta', _key: 'primary'}],
        },
      }),
    ).toBe(false)

    expect(
      stackOnMobile?.hidden?.({
        parent: {
          items: [{_type: 'cta', _key: 'primary'}],
        },
      }),
    ).toBe(false)
  })
})
