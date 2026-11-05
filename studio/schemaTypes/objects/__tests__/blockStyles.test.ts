import {describe, expect, it} from 'vitest'

import {accordionBlockType} from '../../blocks/accordionBlockType'
import {carouselBlockType} from '../../blocks/carouselBlockType'
import {contentBlockType} from '../../blocks/contentBlockType'
import {documentListBlockType} from '../../blocks/documentListBlockType'
import {formBlockType} from '../../blocks/formBlockType'
import {gridBlockType} from '../../blocks/gridBlockType'
import {heroBlockType} from '../../blocks/heroBlockType'
import {pollBlockType} from '../../blocks/pollBlockType'
import {richTextBlockType} from '../../blocks/richTextBlockType'
import {tabsBlockType} from '../../blocks/tabsBlockType'
import {blockStylesType} from '../blockStylesType'

interface FieldLike {
  name?: string
  type?: string
  group?: string
  initialValue?: unknown
  options?: {
    list?: Array<{value?: string}>
  }
}

function getField(schema: {fields?: unknown}, name: string): FieldLike | undefined {
  return ((schema.fields ?? []) as FieldLike[]).find((field) => field.name === name)
}

describe('Block Styles schema', () => {
  it('provides tokenized padding, background, and content-width controls', () => {
    expect(
      getField(blockStylesType, 'verticalPadding')?.options?.list?.map((item) => item.value),
    ).toEqual(['default', 'none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'])

    expect(
      getField(blockStylesType, 'background')?.options?.list?.map((item) => item.value),
    ).toEqual(['default', 'canvas', 'surface', 'brand-muted'])

    expect(
      getField(blockStylesType, 'contentWidth')?.options?.list?.map((item) => item.value),
    ).toEqual(['default', 'narrow', 'standard', 'wide', 'full'])
  })

  it('adds the shared Styles object to every reusable Page Builder block', () => {
    const schemas = [
      heroBlockType,
      carouselBlockType,
      accordionBlockType,
      contentBlockType,
      tabsBlockType,
      formBlockType,
      gridBlockType,
      documentListBlockType,
      richTextBlockType,
      pollBlockType,
    ]

    for (const schema of schemas) {
      expect(getField(schema, 'styles')).toMatchObject({
        type: 'blockStyles',
        group: 'styles',
      })
    }
  })
})
