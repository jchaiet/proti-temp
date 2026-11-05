import {describe, expect, it} from 'vitest'

import {validateDocumentInternalPageLinks, validateInternalPageLink} from '../internalPageLink'
import {createValidationContext} from './testUtils'

type NavigationItemFixture = {
  _type: string
  _key: string
  label: string
  link?: unknown
  [key: string]: unknown
}

function headerWithItem(item: Record<string, unknown>) {
  const navigationItem: NavigationItemFixture = {
    _type: 'navigationItem',
    _key: 'primary',
    label: 'Platform',
    ...item,
  }

  return {
    _type: 'navigationHeader',
    site: {_ref: 'site-a'},
    locale: 'en-us',
    items: [navigationItem],
  }
}

const options = {documentLabel: 'Header Navigation'}

describe('Header navigation mode-aware internal Page validation', () => {
  it.each(['mega', 'dropdown'])(
    'ignores a saved hidden top-level Link in %s mode',
    async (mode) => {
      const document = headerWithItem({
        mode,
        link: {_type: 'link', type: 'internal'},
        ...(mode === 'mega' ? {megaMenu: {sections: []}} : {children: []}),
      })
      const item = document.items[0]
      const {context, getClient} = createValidationContext({document, parent: item})

      await expect(validateInternalPageLink(item.link, context)).resolves.toBe(true)
      await expect(validateDocumentInternalPageLinks(document, context, options)).resolves.toBe(
        true,
      )
      expect(getClient).not.toHaveBeenCalled()
    },
  )

  it('ignores a hidden Link when the object validator supplies its path instead of its parent', async () => {
    const document = headerWithItem({
      mode: 'mega',
      link: {_type: 'link', type: 'internal'},
      megaMenu: {sections: []},
    })
    const {context} = createValidationContext({document})
    const pathContext = {
      ...context,
      path: ['items', {_key: 'primary'}, 'link'],
    } as typeof context

    await expect(validateInternalPageLink(document.items[0].link, pathContext)).resolves.toBe(true)
  })

  it.each(['external', 'anchor'])(
    'accepts an active %s Link without an Internal Page',
    async (type) => {
      const link =
        type === 'external'
          ? {_type: 'link', type, externalUrl: 'https://example.com'}
          : {_type: 'link', type, anchor: 'pricing'}
      const document = headerWithItem({mode: 'link', link})
      const {context, getClient} = createValidationContext({
        document,
        parent: document.items[0],
      })

      await expect(validateInternalPageLink(link, context)).resolves.toBe(true)
      await expect(validateDocumentInternalPageLinks(document, context, options)).resolves.toBe(
        true,
      )
      expect(getClient).not.toHaveBeenCalled()
    },
  )

  it('still requires an Internal Page on an active top-level Link', async () => {
    const document = headerWithItem({
      mode: 'link',
      link: {_type: 'link', type: 'internal'},
    })
    const {context} = createValidationContext({
      document,
      parent: document.items[0],
    })

    await expect(validateInternalPageLink(document.items[0].link, context)).resolves.toBe(
      'Internal page is required.',
    )
  })

  it('continues validating an active internal link within Mega Menu content', async () => {
    const document = headerWithItem({
      mode: 'mega',
      link: {_type: 'link', type: 'internal'},
      megaMenu: {
        sections: [
          {
            _type: 'navigationMegaContentSection',
            _key: 'section',
            items: [
              {
                _type: 'navigationSubItem',
                _key: 'resource',
                link: {_type: 'link', type: 'internal'},
              },
            ],
          },
        ],
      },
    })
    const {context} = createValidationContext({document})

    await expect(validateDocumentInternalPageLinks(document, context, options)).resolves.toEqual({
      message: 'Internal page is required.',
      path: [
        'items',
        {_key: 'primary'},
        'megaMenu',
        'sections',
        {_key: 'section'},
        'items',
        {_key: 'resource'},
        'link',
        'internalPage',
      ],
    })
  })

  it('does not validate stale Mega Menu links when the item changes back to Link mode', async () => {
    const document = headerWithItem({
      mode: 'link',
      link: {_type: 'link', type: 'external', externalUrl: 'https://example.com'},
      megaMenu: {
        sections: [
          {
            _type: 'navigationMegaContentSection',
            _key: 'section',
            items: [
              {
                _type: 'navigationSubItem',
                _key: 'resource',
                link: {_type: 'link', type: 'internal'},
              },
            ],
          },
        ],
      },
    })
    const {context, getClient} = createValidationContext({document})

    await expect(validateDocumentInternalPageLinks(document, context, options)).resolves.toBe(true)
    expect(getClient).not.toHaveBeenCalled()
  })
})
