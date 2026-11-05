import AddIcon from '@sanity/icons/Add'
import ComposeSparklesIcon from '@sanity/icons/ComposeSparkles'

import type {StructureBuilder} from 'sanity/structure'

type SiteLocale = {
  code?: string
  label?: string
}

type Site = {
  _id: string
  name?: string
  locales?: SiteLocale[]
}

function cleanId(id: string): string {
  return id.replace(/^drafts\./, '')
}

function structureId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function localeBlogs(S: StructureBuilder, siteId: string, locale: string) {
  return S.documentList()
    .id(`blogs-${structureId(siteId)}-${structureId(locale)}`)
    .title('Blog')
    .schemaType('blog')
    .filter(
      `
      _type == "blog" &&
      site._ref == $siteId &&
      locale == $locale
    `,
    )
    .params({
      siteId,
      locale,
    })
    .defaultOrdering([
      {
        field: 'publishedAt',
        direction: 'desc',
      },
    ])
    .initialValueTemplates([
      S.initialValueTemplateItem('blog-scoped', {
        siteId,
        locale,
      }),
    ])
    .menuItems([
      S.menuItem()
        .title('Create Blog')
        .icon(AddIcon)
        .showAsAction(true)
        .intent({
          type: 'create',
          params: [
            {
              type: 'blog',
              template: 'blog-scoped',
            },
            {
              siteId,
              locale,
            },
          ],
        }),
    ])
}

export function blogSiteList(S: StructureBuilder, sites: Site[]) {
  return S.listItem()
    .id('blog')
    .title('Blog')
    .icon(ComposeSparklesIcon)
    .child(
      S.list()
        .id('blog-sites')
        .title('Blog')
        .items(
          sites.map((site) => {
            const siteId = cleanId(site._id)

            const locales = (site.locales ?? []).filter(
              (
                locale,
              ): locale is SiteLocale & {
                code: string
              } => Boolean(locale.code),
            )

            return S.listItem()
              .id(`blog-site-${structureId(siteId)}`)
              .title(site.name ?? 'Unnamed Site')
              .child(
                S.list()
                  .id(`blog-locales-${structureId(siteId)}`)
                  .title(site.name ?? 'Unnamed Site')
                  .items(
                    locales.map((locale) =>
                      S.listItem()
                        .id(`blog-locale-${structureId(siteId)}-${structureId(locale.code)}`)
                        .title(locale.label ? `${locale.label} (${locale.code})` : locale.code)
                        .child(localeBlogs(S, siteId, locale.code)),
                    ),
                  ),
              )
          }),
        ),
    )
}
