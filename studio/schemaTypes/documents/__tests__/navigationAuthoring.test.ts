import {describe, expect, it} from 'vitest'

import {authorType} from '../authorType'
import {blogType} from '../blogType'
import {navigationFooterType} from '../navigationFooterType'
import {navigationHeaderType} from '../navigationHeaderType'
import {navigationSetType} from '../navigationSetType'
import {pageType} from '../pageType'
import {siteType} from '../siteType'
import {navigationOverrideType} from '../../objects/navigationOverrideType'

type SchemaGroupLike = {
  name?: string
  title?: string
  default?: boolean
}

type SchemaFieldLike = {
  name?: string
  title?: string
  group?: string
  description?: string
  options?: {
    list?: Array<{
      title?: string
      value?: string
    }>
  }
}

type SchemaLike = {
  groups?: unknown
  fields?: unknown
}

function getGroups(schema: SchemaLike): SchemaGroupLike[] {
  return (schema.groups ?? []) as SchemaGroupLike[]
}

function getFields(schema: SchemaLike): SchemaFieldLike[] {
  return (schema.fields ?? []) as SchemaFieldLike[]
}

function getField(schema: SchemaLike, fieldName: string): SchemaFieldLike {
  const field = getFields(schema).find((candidate) => candidate.name === fieldName)

  if (!field) {
    throw new Error(`Missing schema field: ${fieldName}`)
  }

  return field
}

function expectIdentityFields(schema: SchemaLike) {
  expect(getField(schema, 'site').group).toBe('assignment')
  expect(getField(schema, 'locale').group).toBe('assignment')
  expect(getField(schema, 'title').group).toBe('assignment')
  expect(getField(schema, 'key').group).toBe('assignment')
}

describe('Navigation authoring UX', () => {
  it('starts Header Navigation with identity and locale before content', () => {
    expect(getGroups(navigationHeaderType)).toEqual([
      {
        name: 'assignment',
        title: 'Identity & Locale',
        default: true,
      },
      {
        name: 'content',
        title: 'Header Content',
      },
    ])

    expectIdentityFields(navigationHeaderType)
    expect(getField(navigationHeaderType, 'items').group).toBe('content')
    expect(getField(navigationHeaderType, 'key').description).toContain('same Key for every Locale')
  })

  it('starts Footer Navigation with identity and locale before content', () => {
    expect(getGroups(navigationFooterType)).toEqual([
      {
        name: 'assignment',
        title: 'Identity & Locale',
        default: true,
      },
      {
        name: 'content',
        title: 'Footer Content',
      },
    ])

    expectIdentityFields(navigationFooterType)
    expect(getField(navigationFooterType, 'columns').group).toBe('content')
    expect(getField(navigationFooterType, 'key').description).toContain('same Key for every Locale')
  })

  it('separates Navigation Set identity from Header/Footer composition', () => {
    expect(getGroups(navigationSetType)).toEqual([
      {
        name: 'assignment',
        title: 'Identity & Locale',
        default: true,
      },
      {
        name: 'composition',
        title: 'Header & Footer',
      },
    ])

    expectIdentityFields(navigationSetType)
    expect(getField(navigationSetType, 'headerMode').group).toBe('composition')
    expect(getField(navigationSetType, 'header').group).toBe('composition')
    expect(getField(navigationSetType, 'footerMode').group).toBe('composition')
    expect(getField(navigationSetType, 'footer').group).toBe('composition')
    expect(getField(navigationSetType, 'header').description).toContain('same Site and Locale')
    expect(getField(navigationSetType, 'footer').description).toContain('same Site and Locale')
  })

  it('uses Site + Locale wording for inherited navigation', () => {
    const mode = getField(navigationOverrideType, 'mode')
    const inheritOption = mode.options?.list?.find((option) => option.value === 'inherit')

    expect(inheritOption?.title).toBe('Inherit Site + Locale Default')
    expect(mode.description).toContain('Site + Locale default Navigation Set')

    expect(getField(siteType, 'defaultNavigationSets').description).toContain(
      'Inherit Site + Locale Default',
    )

    expect(getField(pageType, 'navigation').description).toContain(
      'Site + Locale default Navigation Set',
    )
  })

  it('uses URL Segment as the editor-facing route term', () => {
    expect(getField(blogType, 'slug').title).toBe('URL Segment')
    expect(getField(authorType, 'slug').title).toBe('URL Segment')
  })
})
