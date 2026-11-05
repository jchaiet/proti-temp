import type {ValidationContext} from 'sanity'
import {vi} from 'vitest'

export function createValidationContext(options?: {
  document?: Record<string, unknown>
  parent?: unknown
  fetchResults?: unknown[]
}) {
  const fetchResults = [...(options?.fetchResults ?? [])]
  const fetch = vi.fn(async (_query: string, _params?: Record<string, unknown>) =>
    fetchResults.shift(),
  )
  const withConfig = vi.fn(() => ({fetch}))
  const getClient = vi.fn(() => ({withConfig}))

  const context = {
    document: options?.document,
    parent: options?.parent,
    getClient,
  } as unknown as ValidationContext

  return {
    context,
    fetch,
    withConfig,
    getClient,
  }
}

export function pt(text: string, style = 'normal') {
  return [
    {
      _type: 'block',
      style,
      children: [{_type: 'span', text}],
    },
  ]
}
