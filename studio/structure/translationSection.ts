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

function translationTypeList(
  S: StructureBuilder,

  siteId: string,

  contentType: 'page' | 'blog',
) {
  const title = contentType === 'page' ? 'Pages' : 'Blog'

  return S.listItem()
    .id(`translations-${structureId(siteId)}-${contentType}`)
    .title(title)
    .child(
      S.documentList()
        .id(`translation-groups-${structureId(siteId)}-${contentType}`)
        .title(`${title} Translations`)
        .schemaType('translationGroup')
        .filter(
          `
            _type == "translationGroup" &&
            site._ref == $siteId &&
            contentType == $contentType
          `,
        )
        .params({
          siteId,
          contentType,
        })
        .initialValueTemplates([
          S.initialValueTemplateItem('translation-group', {
            siteId,
            contentType,
          }),
        ]),
    )
}

export function translationSiteList(
  S: StructureBuilder,

  sites: Site[],
) {
  return S.listItem()
    .id('translations')
    .title('Translations')
    .child(
      S.list()
        .id('translation-sites')
        .title('Translations')
        .items(
          sites.map((site) => {
            const siteId = cleanId(site._id)

            return S.listItem()
              .id(`translations-site-${structureId(siteId)}`)
              .title(site.name ?? 'Unnamed Site')
              .child(
                S.list()
                  .id(`translation-types-${structureId(siteId)}`)
                  .title(site.name ?? 'Translations')
                  .items([
                    translationTypeList(S, siteId, 'page'),

                    translationTypeList(S, siteId, 'blog'),
                  ]),
              )
          }),
        ),
    )
}
