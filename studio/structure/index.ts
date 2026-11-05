import type {
  ListBuilder,
  StructureBuilder,
  StructureResolver,
  StructureResolverContext,
} from 'sanity/structure'

import AddIcon from '@sanity/icons/Add'
import EditIcon from '@sanity/icons/Edit'
import DocumentIcon from '@sanity/icons/Document'
import HomeIcon from '@sanity/icons/Home'

import EarthGlobeIcon from '@sanity/icons/EarthGlobe'
import MenuIcon from '@sanity/icons/Menu'
import TransferIcon from '@sanity/icons/Transfer'
import TagsIcon from '@sanity/icons/Tags'
import RobotIcon from '@sanity/icons/Robot'

import {authorSiteList} from './authorSection'
import {blogSiteList} from './blogSection'
import {modalSiteList} from './modalSection'

import {map, type Observable} from 'rxjs'

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

type PageSummary = {
  _id: string
  _originalId?: string
  title?: string
  slug?: string
  isHomepage?: boolean
}

type TaxonomySummary = {
  _id: string
  _originalId?: string
  title?: string
  slug?: string
}

type NavigationSummary = {
  _id: string
  _originalId?: string
  title?: string
  key?: string
}

type RedirectSummary = {
  _id: string
  _originalId?: string
  sourcePath?: string
  redirectType?: 'permanent' | 'temporary'
  enabled?: boolean
}

type SingletonSummary = {
  _id: string
  _originalId?: string
  _type?: 'singleton'
  title?: string
  key?: string
  componentType?: string
}

type SingletonUsageSummary = {
  _id: string
  _originalId?: string
  _type: 'page' | 'blog'
  title?: string
}

function cleanId(id: string): string {
  return id.replace(/^drafts\./, '')
}

function structureId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

/* =========================================================
 * Pages
 * ======================================================= */

function pagePane(
  S: StructureBuilder,
  context: StructureResolverContext,
  pageId: string,
  siteId: string,
  locale: string,
): Observable<ListBuilder> {
  const documentStore = context.documentStore

  const cleanPageId = cleanId(pageId)
  const draftPageId = `drafts.${cleanPageId}`

  const fetchQuery = `
    *[
      _type == "page" &&
      (
        _id == $pageId ||
        parent._ref == $pageId
      )
    ]{
      _id,
      _originalId,
      title,
      slug,
      isHomepage
    }
  `

  const listenQuery = `
    *[
      _type == "page" &&
      (
        _id in [
          $pageId,
          $draftPageId
        ] ||
        parent._ref == $pageId
      )
    ]
  `

  const pages$ = documentStore.listenQuery(
    {
      fetch: fetchQuery,
      listen: listenQuery,
    },
    {
      pageId: cleanPageId,
      draftPageId,
    },
    {
      apiVersion: API_VERSION,
      perspective: 'drafts',
    },
  ) as Observable<PageSummary[]>

  return pages$.pipe(
    map((pages: PageSummary[]) => {
      const currentPage = pages.find((page: PageSummary) => cleanId(page._id) === cleanPageId)

      const children = pages
        .filter((page: PageSummary) => cleanId(page._id) !== cleanPageId)
        .sort((a: PageSummary, b: PageSummary) => (a.title ?? '').localeCompare(b.title ?? ''))

      const pageTitle = currentPage?.title ?? 'Page'

      return S.list()
        .id(`page-${structureId(cleanPageId)}`)
        .title(pageTitle)
        .initialValueTemplates([
          S.initialValueTemplateItem('page-child', {
            siteId,
            locale,
            parentId: cleanPageId,
          }),
        ])
        .menuItems([
          S.menuItem()
            .title('Create Child Page')
            .icon(AddIcon)
            .showAsAction(true)
            .intent({
              type: 'create',
              params: [
                {
                  type: 'page',
                  template: 'page-child',
                },
                {
                  siteId,
                  locale,
                  parentId: cleanPageId,
                },
              ],
            }),
        ])
        .items([
          S.listItem()
            .id(`edit-${structureId(cleanPageId)}`)
            .title(`Edit ${pageTitle}`)
            .icon(EditIcon)
            .schemaType('page')
            .child(S.document().schemaType('page').documentId(cleanPageId)),

          S.divider(),

          ...children.map((child: PageSummary) => {
            const childId = cleanId(child._id)

            return S.documentListItem()
              .id(childId)
              .title(child.title ?? 'Untitled Page')
              .schemaType('page')
              .icon(DocumentIcon)
              .child(() => pagePane(S, context, childId, siteId, locale))
          }),
        ])
    }),
  )
}

function localePages(
  S: StructureBuilder,
  context: StructureResolverContext,
  siteId: string,
  locale: string,
): Observable<ListBuilder> {
  const documentStore = context.documentStore

  const fetchQuery = `
    *[
      _type == "page" &&
      site._ref == $siteId &&
      locale == $locale &&
      (
        isHomepage == true ||
        !defined(parent)
      )
    ]{
      _id,
      _originalId,
      title,
      slug,
      isHomepage
    }
  `

  const listenQuery = `
    *[
      _type == "page" &&
      site._ref == $siteId &&
      locale == $locale
    ]
  `

  const pages$ = documentStore.listenQuery(
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
  ) as Observable<PageSummary[]>

  return pages$.pipe(
    map((pages: PageSummary[]) => {
      const sortedPages = [...pages].sort((a: PageSummary, b: PageSummary) => {
        if (a.isHomepage && !b.isHomepage) {
          return -1
        }

        if (!a.isHomepage && b.isHomepage) {
          return 1
        }

        return (a.title ?? '').localeCompare(b.title ?? '')
      })

      return S.list()
        .id(`pages-${structureId(siteId)}-${structureId(locale)}`)
        .title('Pages')
        .initialValueTemplates([
          S.initialValueTemplateItem('page-root', {
            siteId,
            locale,
          }),
        ])
        .menuItems([
          S.menuItem()
            .title('Create Page')
            .icon(AddIcon)
            .showAsAction(true)
            .intent({
              type: 'create',
              params: [
                {
                  type: 'page',
                  template: 'page-root',
                },
                {
                  siteId,
                  locale,
                },
              ],
            }),
        ])
        .items(
          sortedPages.map((page: PageSummary) => {
            const pageId = cleanId(page._id)

            return S.documentListItem()
              .id(pageId)
              .title(page.title ?? 'Untitled Page')
              .schemaType('page')
              .icon(page.isHomepage ? HomeIcon : DocumentIcon)
              .child(() => pagePane(S, context, pageId, siteId, locale))
          }),
        )
    }),
  )
}

/* =========================================================
 * Taxonomy
 * ======================================================= */

function taxonomyPane(
  S: StructureBuilder,
  context: StructureResolverContext,
  taxonomyId: string,
  siteId: string,
): Observable<ListBuilder> {
  const documentStore = context.documentStore

  const cleanTaxonomyId = cleanId(taxonomyId)
  const draftTaxonomyId = `drafts.${cleanTaxonomyId}`

  const fetchQuery = `
    *[
      _type == "taxonomy" &&
      site._ref == $siteId &&
      (
        _id == $taxonomyId ||
        parent._ref == $taxonomyId
      )
    ]{
      _id,
      _originalId,
      title,
      "slug": slug.current
    }
  `

  const listenQuery = `
    *[
      _type == "taxonomy" &&
      site._ref == $siteId &&
      (
        _id in [
          $taxonomyId,
          $draftTaxonomyId
        ] ||
        parent._ref == $taxonomyId
      )
    ]
  `

  const taxonomy$ = documentStore.listenQuery(
    {
      fetch: fetchQuery,
      listen: listenQuery,
    },
    {
      siteId,
      taxonomyId: cleanTaxonomyId,
      draftTaxonomyId,
    },
    {
      apiVersion: API_VERSION,
      perspective: 'drafts',
    },
  ) as Observable<TaxonomySummary[]>

  return taxonomy$.pipe(
    map((documents: TaxonomySummary[]) => {
      const currentDocument = documents.find(
        (document: TaxonomySummary) => cleanId(document._id) === cleanTaxonomyId,
      )

      const children = documents
        .filter((document: TaxonomySummary) => cleanId(document._id) !== cleanTaxonomyId)
        .sort((a: TaxonomySummary, b: TaxonomySummary) =>
          (a.title ?? '').localeCompare(b.title ?? ''),
        )

      const documentTitle = currentDocument?.title ?? 'Taxonomy Term'

      return S.list()
        .id(`taxonomy-${structureId(cleanTaxonomyId)}`)
        .title(documentTitle)
        .initialValueTemplates([
          S.initialValueTemplateItem('taxonomy-child', {
            siteId,
            parentId: cleanTaxonomyId,
          }),
        ])
        .menuItems([
          S.menuItem()
            .title('Create Child Taxonomy Term')
            .icon(AddIcon)
            .showAsAction(true)
            .intent({
              type: 'create',
              params: [
                {
                  type: 'taxonomy',
                  template: 'taxonomy-child',
                },
                {
                  siteId,
                  parentId: cleanTaxonomyId,
                },
              ],
            }),
        ])
        .items([
          S.listItem()
            .id(`edit-taxonomy-${structureId(cleanTaxonomyId)}`)
            .title(`Edit ${documentTitle}`)
            .icon(EditIcon)
            .schemaType('taxonomy')
            .child(S.document().schemaType('taxonomy').documentId(cleanTaxonomyId)),

          S.divider(),

          ...children.map((child: TaxonomySummary) => {
            const childId = cleanId(child._id)

            return S.documentListItem()
              .id(childId)
              .title(child.title ?? 'Untitled Taxonomy Term')
              .schemaType('taxonomy')
              .icon(DocumentIcon)
              .child(() => taxonomyPane(S, context, childId, siteId))
          }),
        ])
    }),
  )
}

function siteTaxonomy(
  S: StructureBuilder,
  context: StructureResolverContext,
  siteId: string,
): Observable<ListBuilder> {
  const documentStore = context.documentStore

  const fetchQuery = `
    *[
      _type == "taxonomy" &&
      site._ref == $siteId &&
      !defined(parent)
    ]{
      _id,
      _originalId,
      title,
      "slug": slug.current
    }
  `

  const listenQuery = `
    *[
      _type == "taxonomy" &&
      site._ref == $siteId
    ]
  `

  const taxonomy$ = documentStore.listenQuery(
    {
      fetch: fetchQuery,
      listen: listenQuery,
    },
    {
      siteId,
    },
    {
      apiVersion: API_VERSION,
      perspective: 'drafts',
    },
  ) as Observable<TaxonomySummary[]>

  return taxonomy$.pipe(
    map((documents: TaxonomySummary[]) => {
      const sortedDocuments = [...documents].sort((a: TaxonomySummary, b: TaxonomySummary) =>
        (a.title ?? '').localeCompare(b.title ?? ''),
      )

      return S.list()
        .id(`taxonomy-${structureId(siteId)}`)
        .title('Taxonomy')
        .initialValueTemplates([
          S.initialValueTemplateItem('taxonomy-root', {
            siteId,
          }),
        ])
        .menuItems([
          S.menuItem()
            .title('Create Taxonomy Term')
            .icon(AddIcon)
            .showAsAction(true)
            .intent({
              type: 'create',
              params: [
                {
                  type: 'taxonomy',
                  template: 'taxonomy-root',
                },
                {
                  siteId,
                },
              ],
            }),
        ])
        .items(
          sortedDocuments.map((document: TaxonomySummary) => {
            const documentId = cleanId(document._id)

            return S.documentListItem()
              .id(documentId)
              .title(document.title ?? 'Untitled Taxonomy Term')
              .schemaType('taxonomy')
              .icon(DocumentIcon)
              .child(() => taxonomyPane(S, context, documentId, siteId))
          }),
        )
    }),
  )
}

function taxonomySiteList(S: StructureBuilder, context: StructureResolverContext, sites: Site[]) {
  return S.listItem()
    .id('taxonomy')
    .title('Taxonomy')
    .icon(TagsIcon)
    .child(
      S.list()
        .id('taxonomy-sites')
        .title('Taxonomy')
        .items(
          sites.map((site: Site) => {
            const siteId = cleanId(site._id)

            return S.listItem()
              .id(`taxonomy-site-${structureId(siteId)}`)
              .title(site.name ?? 'Unnamed Site')
              .child(() => siteTaxonomy(S, context, siteId))
          }),
        ),
    )
}

/* =========================================================
 * Navigation
 * ======================================================= */

type NavigationDocumentType = 'navigationSet' | 'navigationHeader' | 'navigationFooter'

type NavigationListConfig = {
  type: NavigationDocumentType
  title: string
  templateId: string
  createTitle: string
}

const NAVIGATION_LISTS: NavigationListConfig[] = [
  {
    type: 'navigationSet',
    title: 'Navigation Sets',
    templateId: 'navigation-set',
    createTitle: 'Create Navigation Set',
  },
  {
    type: 'navigationHeader',
    title: 'Headers',
    templateId: 'navigation-header',
    createTitle: 'Create Header',
  },
  {
    type: 'navigationFooter',
    title: 'Footers',
    templateId: 'navigation-footer',
    createTitle: 'Create Footer',
  },
]

function localeNavigationDocuments(
  S: StructureBuilder,
  context: StructureResolverContext,
  siteId: string,
  locale: string,
  config: NavigationListConfig,
): Observable<ListBuilder> {
  const documentStore = context.documentStore

  const fetchQuery = `
    *[
      _type == $type &&
      site._ref == $siteId &&
      locale == $locale
    ] | order(
      title asc
    ){
      _id,
      _originalId,
      title,
      key
    }
  `

  const listenQuery = `
    *[
      _type == $type &&
      site._ref == $siteId &&
      locale == $locale
    ]
  `

  const documents$ = documentStore.listenQuery(
    {
      fetch: fetchQuery,
      listen: listenQuery,
    },
    {
      type: config.type,
      siteId,
      locale,
    },
    {
      apiVersion: API_VERSION,
      perspective: 'drafts',
    },
  ) as Observable<NavigationSummary[]>

  return documents$.pipe(
    map((documents: NavigationSummary[]) => {
      const sortedDocuments = [...documents].sort(
        (first: NavigationSummary, second: NavigationSummary) =>
          (first.title ?? '').localeCompare(second.title ?? ''),
      )

      return S.list()
        .id(`${structureId(config.type)}-${structureId(siteId)}-${structureId(locale)}`)
        .title(config.title)
        .initialValueTemplates([
          S.initialValueTemplateItem(config.templateId, {
            siteId,
            locale,
          }),
        ])
        .menuItems([
          S.menuItem()
            .title(config.createTitle)
            .icon(AddIcon)
            .showAsAction(true)
            .intent({
              type: 'create',
              params: [
                {
                  type: config.type,
                  template: config.templateId,
                },
                {
                  siteId,
                  locale,
                },
              ],
            }),
        ])
        .items(
          sortedDocuments.map((document: NavigationSummary) => {
            const documentId = cleanId(document._id)

            const title = document.title ?? `Untitled ${config.title.replace(/s$/, '')}`

            return S.documentListItem()
              .id(documentId)
              .title(title)
              .schemaType(config.type)
              .icon(DocumentIcon)
              .child(S.document().schemaType(config.type).documentId(documentId))
          }),
        )
    }),
  )
}

function localeNavigation(
  S: StructureBuilder,
  context: StructureResolverContext,
  siteId: string,
  locale: string,
) {
  return S.list()
    .id(`navigation-${structureId(siteId)}-${structureId(locale)}`)
    .title('Navigation')
    .items(
      NAVIGATION_LISTS.map((config: NavigationListConfig) =>
        S.listItem()
          .id(
            `navigation-${structureId(config.type)}-${structureId(siteId)}-${structureId(locale)}`,
          )
          .title(config.title)
          .icon(DocumentIcon)
          .child(() => localeNavigationDocuments(S, context, siteId, locale, config)),
      ),
    )
}

function navigationSiteList(S: StructureBuilder, context: StructureResolverContext, sites: Site[]) {
  return S.listItem()
    .id('navigation')
    .title('Navigation')
    .icon(MenuIcon)
    .child(
      S.list()
        .id('navigation-sites')
        .title('Navigation')
        .items(
          sites.map((site: Site) => {
            const siteId = cleanId(site._id)

            const locales = (site.locales ?? []).filter(
              (
                locale,
              ): locale is SiteLocale & {
                code: string
              } => Boolean(locale.code),
            )

            return S.listItem()
              .id(`navigation-site-${structureId(siteId)}`)
              .title(site.name ?? 'Unnamed Site')
              .child(
                S.list()
                  .id(`navigation-locales-${structureId(siteId)}`)
                  .title(site.name ?? 'Unnamed Site')
                  .items(
                    locales.map(
                      (
                        locale: SiteLocale & {
                          code: string
                        },
                      ) =>
                        S.listItem()
                          .id(
                            `navigation-locale-${structureId(siteId)}-${structureId(locale.code)}`,
                          )
                          .title(locale.label ? `${locale.label} (${locale.code})` : locale.code)
                          .child(() => localeNavigation(S, context, siteId, locale.code)),
                    ),
                  ),
              )
          }),
        ),
    )
}

/* =========================================================
 * Singletons
 * ======================================================= */

function singletonPane(
  S: StructureBuilder,
  context: StructureResolverContext,
  singletonId: string,
  siteId: string,
  locale: string,
): Observable<ListBuilder> {
  const documentStore = context.documentStore

  const cleanSingletonId = cleanId(singletonId)
  const draftSingletonId = `drafts.${cleanSingletonId}`

  const fetchQuery = `
    *[
      (
        _type == "singleton" &&
        _id == $singletonId
      ) ||
      (
        _type in ["page", "blog"] &&
        site._ref == $siteId &&
        locale == $locale &&
        (
          references($singletonId) ||
          references($draftSingletonId)
        )
      )
    ]{
      _id,
      _originalId,
      _type,
      title,
      key,
      "componentType": component[0]._type
    }
  `

  const listenQuery = `
    *[
      (
        _type == "singleton" &&
        _id in [$singletonId, $draftSingletonId]
      ) ||
      (
        _type in ["page", "blog"] &&
        site._ref == $siteId &&
        locale == $locale &&
        (
          references($singletonId) ||
          references($draftSingletonId)
        )
      )
    ]
  `

  const documents$ = documentStore.listenQuery(
    {
      fetch: fetchQuery,
      listen: listenQuery,
    },
    {
      singletonId: cleanSingletonId,
      draftSingletonId,
      siteId,
      locale,
    },
    {
      apiVersion: API_VERSION,
      perspective: 'drafts',
    },
  ) as Observable<Array<SingletonSummary | SingletonUsageSummary>>

  return documents$.pipe(
    map((documents: Array<SingletonSummary | SingletonUsageSummary>) => {
      const singleton = documents.find(
        (document): document is SingletonSummary => document._type === 'singleton',
      )

      const usageById = new Map<string, SingletonUsageSummary>()

      for (const document of documents) {
        if (document._type !== 'page' && document._type !== 'blog') {
          continue
        }

        usageById.set(cleanId(document._id), document)
      }

      const usages = [...usageById.values()].sort((first, second) =>
        (first.title ?? '').localeCompare(second.title ?? ''),
      )

      const singletonTitle = singleton?.title ?? 'Singleton'

      const usageItems = usages.map((usage) => {
        const usageId = cleanId(usage._id)
        const typeLabel = usage._type === 'blog' ? 'Blog' : 'Page'

        return S.documentListItem()
          .id(`singleton-usage-${structureId(usage._type)}-${structureId(usageId)}`)
          .title(`${typeLabel}: ${usage.title ?? `Untitled ${typeLabel}`}`)
          .schemaType(usage._type)
          .icon(DocumentIcon)
          .child(S.document().schemaType(usage._type).documentId(usageId))
      })

      return S.list()
        .id(`singleton-${structureId(cleanSingletonId)}`)
        .title(singletonTitle)
        .items([
          S.listItem()
            .id(`edit-singleton-${structureId(cleanSingletonId)}`)
            .title(`Edit ${singletonTitle}`)
            .icon(EditIcon)
            .schemaType('singleton')
            .child(S.document().schemaType('singleton').documentId(cleanSingletonId)),

          S.divider(),

          S.listItem()
            .id(`singleton-used-on-${structureId(cleanSingletonId)}`)
            .title(`Used On (${usages.length})`)
            .icon(DocumentIcon)
            .child(
              S.list()
                .id(`singleton-usage-list-${structureId(cleanSingletonId)}`)
                .title(`Used On (${usages.length})`)
                .items(usageItems),
            ),
        ])
    }),
  )
}

function localeSingletons(
  S: StructureBuilder,
  context: StructureResolverContext,
  siteId: string,
  locale: string,
): Observable<ListBuilder> {
  const documentStore = context.documentStore

  const fetchQuery = `
    *[
      _type == "singleton" &&
      site._ref == $siteId &&
      locale == $locale
    ] | order(title asc){
      _id,
      _originalId,
      _type,
      title,
      key,
      "componentType": component[0]._type
    }
  `

  const listenQuery = `
    *[
      _type == "singleton" &&
      site._ref == $siteId &&
      locale == $locale
    ]
  `

  const singletons$ = documentStore.listenQuery(
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
  ) as Observable<SingletonSummary[]>

  return singletons$.pipe(
    map((singletons: SingletonSummary[]) => {
      const byId = new Map<string, SingletonSummary>()

      for (const singleton of singletons) {
        byId.set(cleanId(singleton._id), singleton)
      }

      const sortedSingletons = [...byId.values()].sort((first, second) =>
        (first.title ?? '').localeCompare(second.title ?? ''),
      )

      return S.list()
        .id(`singletons-${structureId(siteId)}-${structureId(locale)}`)
        .title('Singletons')
        .initialValueTemplates([
          S.initialValueTemplateItem('singleton-scoped', {
            siteId,
            locale,
          }),
        ])
        .menuItems([
          S.menuItem()
            .title('Create Singleton')
            .icon(AddIcon)
            .showAsAction(true)
            .intent({
              type: 'create',
              params: [
                {
                  type: 'singleton',
                  template: 'singleton-scoped',
                },
                {
                  siteId,
                  locale,
                },
              ],
            }),
        ])
        .items(
          sortedSingletons.map((singleton) => {
            const singletonId = cleanId(singleton._id)
            const subtitle = [singleton.componentType, singleton.key].filter(Boolean).join(' • ')

            return S.documentListItem()
              .id(`singleton-${structureId(singletonId)}`)
              .title(
                subtitle
                  ? `${singleton.title ?? 'Untitled Singleton'} • ${subtitle}`
                  : (singleton.title ?? 'Untitled Singleton'),
              )
              .schemaType('singleton')
              .icon(DocumentIcon)
              .child(() => singletonPane(S, context, singletonId, siteId, locale))
          }),
        )
    }),
  )
}

function singletonSiteList(S: StructureBuilder, context: StructureResolverContext, sites: Site[]) {
  return S.listItem()
    .id('singletons')
    .title('Singletons')
    .icon(RobotIcon)
    .child(
      S.list()
        .id('singleton-sites')
        .title('Singletons')
        .items(
          sites.map((site: Site) => {
            const siteId = cleanId(site._id)

            const locales = (site.locales ?? []).filter(
              (
                locale,
              ): locale is SiteLocale & {
                code: string
              } => Boolean(locale.code),
            )

            return S.listItem()
              .id(`singleton-site-${structureId(siteId)}`)
              .title(site.name ?? 'Unnamed Site')
              .child(
                S.list()
                  .id(`singleton-locales-${structureId(siteId)}`)
                  .title(site.name ?? 'Unnamed Site')
                  .items(
                    locales.map(
                      (
                        locale: SiteLocale & {
                          code: string
                        },
                      ) =>
                        S.listItem()
                          .id(`singleton-locale-${structureId(siteId)}-${structureId(locale.code)}`)
                          .title(locale.label ? `${locale.label} (${locale.code})` : locale.code)
                          .child(() => localeSingletons(S, context, siteId, locale.code)),
                    ),
                  ),
              )
          }),
        ),
    )
}

/* =========================================================
 * Redirects
 * ======================================================= */

function localeRedirects(
  S: StructureBuilder,
  context: StructureResolverContext,
  siteId: string,
  locale: string,
): Observable<ListBuilder> {
  const documentStore = context.documentStore

  const fetchQuery = `
    *[
      _type == "redirect" &&
      site._ref == $siteId &&
      locale == $locale
    ] | order(sourcePath asc){
      _id,
      _originalId,
      sourcePath,
      redirectType,
      enabled
    }
  `

  const listenQuery = `
    *[
      _type == "redirect" &&
      site._ref == $siteId &&
      locale == $locale
    ]
  `

  const redirects$ = documentStore.listenQuery(
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
  ) as Observable<RedirectSummary[]>

  return redirects$.pipe(
    map((redirects: RedirectSummary[]) => {
      const sortedRedirects = [...redirects].sort(
        (first: RedirectSummary, second: RedirectSummary) =>
          (first.sourcePath ?? '').localeCompare(second.sourcePath ?? ''),
      )

      return S.list()
        .id(`redirects-${structureId(siteId)}-${structureId(locale)}`)
        .title('Redirects')
        .initialValueTemplates([
          S.initialValueTemplateItem('redirect', {
            siteId,
            locale,
          }),
        ])
        .menuItems([
          S.menuItem()
            .title('Create Redirect')
            .icon(AddIcon)
            .showAsAction(true)
            .intent({
              type: 'create',
              params: [
                {
                  type: 'redirect',
                  template: 'redirect',
                },
                {
                  siteId,
                  locale,
                },
              ],
            }),
        ])
        .items(
          sortedRedirects.map((redirect: RedirectSummary) => {
            const documentId = cleanId(redirect._id)

            const status =
              redirect.enabled === false
                ? 'Disabled'
                : redirect.redirectType === 'temporary'
                  ? '307'
                  : '308'

            return S.documentListItem()
              .id(documentId)
              .title(
                redirect.sourcePath
                  ? `${redirect.sourcePath} • ${status}`
                  : `Untitled Redirect • ${status}`,
              )
              .schemaType('redirect')
              .icon(DocumentIcon)
              .child(S.document().schemaType('redirect').documentId(documentId))
          }),
        )
    }),
  )
}

function redirectsSiteList(S: StructureBuilder, context: StructureResolverContext, sites: Site[]) {
  return S.listItem()
    .id('redirects')
    .title('Redirects')
    .icon(TransferIcon)
    .child(
      S.list()
        .id('redirect-sites')
        .title('Redirects')
        .items(
          sites.map((site: Site) => {
            const siteId = cleanId(site._id)

            const locales = (site.locales ?? []).filter(
              (
                locale,
              ): locale is SiteLocale & {
                code: string
              } => Boolean(locale.code),
            )

            return S.listItem()
              .id(`redirect-site-${structureId(siteId)}`)
              .title(site.name ?? 'Unnamed Site')
              .child(
                S.list()
                  .id(`redirect-locales-${structureId(siteId)}`)
                  .title(site.name ?? 'Unnamed Site')
                  .items(
                    locales.map(
                      (
                        locale: SiteLocale & {
                          code: string
                        },
                      ) =>
                        S.listItem()
                          .id(`redirect-locale-${structureId(siteId)}-${structureId(locale.code)}`)
                          .title(locale.label ? `${locale.label} (${locale.code})` : locale.code)
                          .child(() => localeRedirects(S, context, siteId, locale.code)),
                    ),
                  ),
              )
          }),
        ),
    )
}

/* =========================================================
 * Root Structure
 * ======================================================= */

export const structure: StructureResolver = async (S, context) => {
  const client = context
    .getClient({
      apiVersion: API_VERSION,
    })
    .withConfig({
      perspective: 'drafts',
    })

  const sites = await client.fetch<Site[]>(
    `
      *[
        _type == "site"
      ] | order(name asc){
        _id,
        name,
        locales[]{
          code,
          label
        }
      }
    `,
  )

  return S.list()
    .title('Website')
    .items([
      /*
       * Pages
       */
      S.listItem()
        .title('Pages')
        .icon(DocumentIcon)
        .child(
          S.list()
            .title('Sites')
            .items(
              sites.map((site: Site) => {
                const siteId = cleanId(site._id)

                const locales = (site.locales ?? []).filter(
                  (
                    locale,
                  ): locale is SiteLocale & {
                    code: string
                  } => Boolean(locale.code),
                )

                return S.listItem()
                  .id(`site-${structureId(siteId)}`)
                  .title(site.name ?? 'Unnamed Site')
                  .child(
                    S.list()
                      .title(site.name ?? 'Unnamed Site')
                      .items(
                        locales.map(
                          (
                            locale: SiteLocale & {
                              code: string
                            },
                          ) =>
                            S.listItem()
                              .id(`locale-${structureId(locale.code)}`)
                              .title(
                                locale.label ? `${locale.label} (${locale.code})` : locale.code,
                              )
                              .child(() => localePages(S, context, siteId, locale.code)),
                        ),
                      ),
                  )
              }),
            ),
        ),

      S.divider(),

      blogSiteList(S, sites),

      authorSiteList(S, sites),

      singletonSiteList(S, context, sites),

      modalSiteList(S, context, sites),

      navigationSiteList(S, context, sites),

      redirectsSiteList(S, context, sites),

      /*
       * Unified Taxonomy
       */
      taxonomySiteList(S, context, sites),

      S.divider(),

      /*
       * Sites
       */
      S.documentTypeListItem('site').title('Sites').icon(EarthGlobeIcon),
    ])
}
