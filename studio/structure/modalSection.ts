import AddIcon from '@sanity/icons/Add'
import DocumentIcon from '@sanity/icons/Document'
import RocketIcon from '@sanity/icons/Rocket'
import type {Observable} from 'rxjs'
import {map} from 'rxjs/operators'
import type {ListBuilder, StructureBuilder, StructureResolverContext} from 'sanity/structure'

const API_VERSION = '2026-08-21'

type SiteLocale = {
  code?: string
  label?: string
}

type Site = {
  _id: string
  name?: string
  locales?: SiteLocale[]
}

type ModalSummary = {
  _id: string
  title?: string
  key?: string
}

function cleanId(id: string): string {
  return id.replace(/^drafts\./, '')
}

function structureId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function localeModals(
  S: StructureBuilder,
  context: StructureResolverContext,
  siteId: string,
  locale: string,
): Observable<ListBuilder> {
  const documentStore = context.documentStore

  const fetchQuery = `
    *[
      _type == "modal" &&
      site._ref == $siteId &&
      locale == $locale
    ] | order(title asc) {
      _id,
      title,
      key
    }
  `

  const listenQuery = `
    *[
      _type == "modal" &&
      site._ref == $siteId &&
      locale == $locale
    ]
  `

  const modals$ = documentStore.listenQuery(
    {
      fetch: fetchQuery,
      listen: listenQuery,
    },
    {
      siteId,
      locale,
    },
    {
      apiVersion: API_VERSION,
      perspective: 'drafts',
    },
  ) as Observable<ModalSummary[]>

  return modals$.pipe(
    map((modals: ModalSummary[]) => {
      const sorted = [...modals].sort((first, second) =>
        (first.title ?? '').localeCompare(second.title ?? ''),
      )

      return S.list()
        .id(`modals-${structureId(siteId)}-${structureId(locale)}`)
        .title('Modals')
        .initialValueTemplates([
          S.initialValueTemplateItem('modal-scoped', {
            siteId,
            locale,
          }),
        ])
        .menuItems([
          S.menuItem()
            .title('Create Modal')
            .icon(AddIcon)
            .showAsAction(true)
            .intent({
              type: 'create',
              params: [
                {
                  type: 'modal',
                  template: 'modal-scoped',
                },
                {
                  siteId,
                  locale,
                },
              ],
            }),
        ])
        .items(
          sorted.map((modal) => {
            const modalId = cleanId(modal._id)

            return S.documentListItem()
              .id(modalId)
              .title(modal.title ?? 'Untitled Modal')
              .schemaType('modal')
              .icon(DocumentIcon)
              .child(S.document().schemaType('modal').documentId(modalId))
          }),
        )
    }),
  )
}

export function modalSiteList(
  S: StructureBuilder,
  context: StructureResolverContext,
  sites: Site[],
) {
  return S.listItem()
    .id('modals')
    .title('Modals')
    .icon(RocketIcon)
    .child(
      S.list()
        .id('modal-sites')
        .title('Modals')
        .items(
          sites.map((site) => {
            const siteId = cleanId(site._id)
            const locales = (site.locales ?? []).filter(
              (locale): locale is SiteLocale & {code: string} => Boolean(locale.code),
            )

            return S.listItem()
              .id(`modal-site-${structureId(siteId)}`)
              .title(site.name ?? 'Unnamed Site')
              .child(
                S.list()
                  .id(`modal-locales-${structureId(siteId)}`)
                  .title(site.name ?? 'Unnamed Site')
                  .items(
                    locales.map((locale) =>
                      S.listItem()
                        .id(`modal-locale-${structureId(siteId)}-${structureId(locale.code)}`)
                        .title(locale.label ? `${locale.label} (${locale.code})` : locale.code)
                        .child(() => localeModals(S, context, siteId, locale.code)),
                    ),
                  ),
              )
          }),
        ),
    )
}
