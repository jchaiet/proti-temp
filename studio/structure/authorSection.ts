import {UserIcon} from '@sanity/icons/User'

import type {StructureBuilder} from 'sanity/structure'

type Site = {
  _id: string
  name?: string
}

function cleanId(id: string): string {
  return id.replace(/^drafts\./, '')
}

function structureId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export function authorSiteList(S: StructureBuilder, sites: Site[]) {
  return S.listItem()
    .id('authors')
    .title('Authors')
    .icon(UserIcon)
    .child(
      S.list()
        .id('author-sites')
        .title('Authors')
        .items(
          sites.map((site) => {
            const siteId = cleanId(site._id)

            return S.listItem()
              .id(`author-site-${structureId(siteId)}`)
              .title(site.name ?? 'Unnamed Site')
              .child(
                S.documentList()
                  .id(`authors-${structureId(siteId)}`)
                  .title('Authors')
                  .schemaType('author')
                  .filter(`_type == "author" && site._ref == $siteId`)
                  .params({
                    siteId,
                  })
                  .defaultOrdering([
                    {
                      field: 'name',
                      direction: 'asc',
                    },
                  ])
                  .initialValueTemplates([
                    S.initialValueTemplateItem('author', {
                      siteId,
                    }),
                  ]),
              )
          }),
        ),
    )
}
