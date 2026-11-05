import {describe, expect, it} from 'vitest'

import {documentListBlockType} from '../documentListBlockType'
import {formBlockType} from '../formBlockType'
import {pollBlockType} from '../pollBlockType'

type SchemaGroupLike = {
  name?: string
  title?: string
  default?: boolean
}

type HiddenContext = {
  parent?: Record<string, unknown>
}

type SchemaFieldLike = {
  name?: string
  group?: string
  hidden?: boolean | ((context: HiddenContext) => boolean)
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

function getGroupNames(schema: SchemaLike): string[] {
  return getGroups(schema)
    .map((group) => group.name)
    .filter((name): name is string => Boolean(name))
}

function expectFieldGroups(schema: SchemaLike, expected: Record<string, string>) {
  for (const [fieldName, groupName] of Object.entries(expected)) {
    expect(getField(schema, fieldName).group, fieldName).toBe(groupName)
  }
}

function isHidden(field: SchemaFieldLike, parent: Record<string, unknown>): boolean {
  if (typeof field.hidden === 'function') {
    return field.hidden({parent})
  }

  return field.hidden === true
}

describe('block authoring groups', () => {
  it('organizes Document List into focused authoring tabs', () => {
    expect(getGroupNames(documentListBlockType)).toEqual([
      'content',
      'dataSource',
      'searchFilters',
      'sortingPagination',
      'styles',
    ])

    expect(
      getGroups(documentListBlockType).find((group) => group.name === 'content')?.default,
    ).toBe(true)

    expectFieldGroups(documentListBlockType, {
      heading: 'content',
      alignment: 'content',
      gridCols: 'content',
      emptyStateText: 'content',
      sourceMode: 'dataSource',
      documents: 'dataSource',
      dynamicContentTypes: 'dataSource',
      dynamicTaxonomy: 'dataSource',
      dynamicTaxonomyMatchLogic: 'dataSource',
      enableSearch: 'searchFilters',
      searchPlaceholder: 'searchFilters',
      requireSearchQuery: 'searchFilters',
      enableFilters: 'searchFilters',
      taxonomyFilterGroups: 'searchFilters',
      dynamicSort: 'sortingPagination',
      dynamicLimit: 'sortingPagination',
      enableSorting: 'sortingPagination',
      enablePagination: 'sortingPagination',
      itemsPerPage: 'sortingPagination',
      styles: 'styles',
    })
  })

  it('organizes Form settings around the authoring task', () => {
    expect(getGroupNames(formBlockType)).toEqual([
      'contentLayout',
      'formFields',
      'behavior',
      'submitButton',
      'styles',
    ])

    expect(getGroups(formBlockType).find((group) => group.name === 'contentLayout')?.default).toBe(
      true,
    )

    expectFieldGroups(formBlockType, {
      heading: 'contentLayout',
      layout: 'contentLayout',
      alignment: 'contentLayout',
      formPosition: 'contentLayout',
      image: 'contentLayout',
      formMode: 'formFields',
      fields: 'formFields',
      steps: 'formFields',
      nextButtonText: 'behavior',
      previousButtonText: 'behavior',
      showProgress: 'behavior',
      formKey: 'behavior',
      submitButtonText: 'submitButton',
      submitButtonVariant: 'submitButton',
      submitButtonSize: 'submitButton',
      submitButtonIcon: 'submitButton',
      submitButtonIconAlignment: 'submitButton',
      styles: 'styles',
    })
  })

  it('organizes Poll content, results, and messages separately', () => {
    expect(getGroupNames(pollBlockType)).toEqual(['content', 'results', 'messages', 'styles'])

    expect(getGroups(pollBlockType).find((group) => group.name === 'content')?.default).toBe(true)

    expectFieldGroups(pollBlockType, {
      heading: 'content',
      pollKey: 'content',
      options: 'content',
      layout: 'content',
      alignment: 'content',
      showResultsOnSubmit: 'results',
      resultsType: 'results',
      singleResultOptionId: 'results',
      singleResultMessage: 'results',
      confirmationMessage: 'messages',
      errorMessage: 'messages',
      styles: 'styles',
    })
  })

  it('treats a missing Poll show-results value as the default enabled state', () => {
    const optionId = getField(pollBlockType, 'singleResultOptionId')
    const message = getField(pollBlockType, 'singleResultMessage')

    expect(isHidden(optionId, {resultsType: 'singleOptionCount'})).toBe(false)
    expect(isHidden(message, {resultsType: 'singleOptionCount'})).toBe(false)

    expect(
      isHidden(optionId, {
        showResultsOnSubmit: false,
        resultsType: 'singleOptionCount',
      }),
    ).toBe(true)

    expect(
      isHidden(message, {
        showResultsOnSubmit: false,
        resultsType: 'singleOptionCount',
      }),
    ).toBe(true)
  })
})
