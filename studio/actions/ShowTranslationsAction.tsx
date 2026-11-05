import {useEffect, useMemo, useState} from 'react'

import EarthGlobeIcon from '@sanity/icons/EarthGlobe'
import {Badge, Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'

import {type DocumentActionComponent, useClient} from 'sanity'
import {useIntentLink, useRouter} from 'sanity/router'

const API_VERSION = '2026-08-21'

type NavigationDocumentType = 'navigationHeader' | 'navigationFooter' | 'navigationSet'

type KeyedContentDocumentType = 'singleton' | 'modal'

type KeyedDocumentType = NavigationDocumentType | KeyedContentDocumentType

type TranslatableType = 'page' | 'blog' | KeyedDocumentType

type Reference = {
  _type?: 'reference'
  _ref?: string
  _weak?: boolean
  _strengthenOnPublish?: {
    type?: string
  }
}

type Slug = {
  current?: string
}

type TranslatableDocument = Record<string, unknown> & {
  _id?: string
  _type?: string
  _rev?: string
  _createdAt?: string
  _updatedAt?: string
  _originalId?: string

  site?: Reference
  locale?: string

  parent?: Reference
  slug?: string | Slug
  isHomepage?: boolean

  key?: string

  navigation?: unknown
  taxonomy?: unknown[]
  author?: Reference

  headerMode?: 'custom' | 'none'
  footerMode?: 'custom' | 'none'

  header?: Reference
  footer?: Reference
}

type SiteLocale = {
  code?: string
  label?: string
}

type SiteDocument = {
  locales?: SiteLocale[]
}

type TranslationState = 'current' | 'published' | 'draft' | 'changes' | 'missing'

type TranslationRow = {
  locale: string
  label: string
  state: TranslationState
  documentId?: string
  targetParentId?: string
  reason?: string
}

type StudioClient = ReturnType<typeof useClient>

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, '') ?? ''
}

function isNavigationDocumentType(type: TranslatableType): type is NavigationDocumentType {
  return type === 'navigationHeader' || type === 'navigationFooter' || type === 'navigationSet'
}

function isKeyedContentDocumentType(type: TranslatableType): type is KeyedContentDocumentType {
  return type === 'singleton' || type === 'modal'
}

function isKeyedDocumentType(type: TranslatableType): type is KeyedDocumentType {
  return isNavigationDocumentType(type) || isKeyedContentDocumentType(type)
}

function getPageSlug(document: TranslatableDocument): string | undefined {
  return typeof document.slug === 'string' ? document.slug : undefined
}

function getBlogSlug(document: TranslatableDocument): string | undefined {
  return typeof document.slug === 'object' ? document.slug?.current : undefined
}

async function getDocumentStatus(
  rawClient: StudioClient,
  documentId: string,
): Promise<'published' | 'draft' | 'changes'> {
  const cleanDocumentId = cleanId(documentId)
  const draftId = `drafts.${cleanDocumentId}`

  const ids = await rawClient.fetch<string[]>(
    `
      *[
        _id in [
          $documentId,
          $draftId
        ]
      ]._id
    `,
    {
      documentId: cleanDocumentId,
      draftId,
    },
  )

  const hasDraft = ids.includes(draftId)
  const hasPublished = ids.includes(cleanDocumentId)

  if (hasDraft && hasPublished) {
    return 'changes'
  }

  if (hasDraft) {
    return 'draft'
  }

  return 'published'
}

async function getDocumentById(
  draftClient: StudioClient,
  documentId: string,
  documentType?: TranslatableType,
): Promise<TranslatableDocument | null> {
  const cleanDocumentId = cleanId(documentId)

  return draftClient.fetch<TranslatableDocument | null>(
    `
      *[
        _id == $documentId &&
        (
          !defined($documentType) ||
          _type == $documentType
        )
      ][0]
    `,
    {
      documentId: cleanDocumentId,
      documentType,
    },
  )
}

/* =========================================================
 * Pages
 * ======================================================= */

async function getSourcePageChain(
  draftClient: StudioClient,
  source: TranslatableDocument,
): Promise<TranslatableDocument[]> {
  const chain = [source]

  if (source.isHomepage === true) {
    return chain
  }

  let parentId = cleanId(source.parent?._ref)

  const visited = new Set<string>()

  let depth = 0

  while (parentId && depth < 50) {
    if (visited.has(parentId)) {
      throw new Error('Circular Page hierarchy detected.')
    }

    visited.add(parentId)

    const parent = await getDocumentById(draftClient, parentId, 'page')

    if (!parent) {
      throw new Error('A Parent Page could not be resolved.')
    }

    chain.unshift(parent)

    parentId = cleanId(parent.parent?._ref)
    depth++
  }

  if (depth >= 50) {
    throw new Error('Page hierarchy is too deep.')
  }

  return chain
}

async function getSourcePageSegments(
  draftClient: StudioClient,
  source: TranslatableDocument,
): Promise<string[]> {
  if (source.isHomepage === true) {
    return []
  }

  const chain = await getSourcePageChain(draftClient, source)

  return chain.map((page) => {
    const slug = getPageSlug(page)

    if (!slug) {
      throw new Error('A Page in the current hierarchy is missing its URL Segment.')
    }

    return slug
  })
}

async function findHomepage(
  draftClient: StudioClient,
  rawClient: StudioClient,
  siteId: string,
  locale: string,
): Promise<TranslationRow | null> {
  const document = await draftClient.fetch<{_id: string} | null>(
    `
      *[
        _type == "page" &&
        site._ref == $siteId &&
        locale == $locale &&
        isHomepage == true
      ][0]{
        _id
      }
    `,
    {
      siteId,
      locale,
    },
  )

  if (!document?._id) {
    return null
  }

  const documentId = cleanId(document._id)

  return {
    locale,
    label: locale,
    state: await getDocumentStatus(rawClient, documentId),
    documentId,
  }
}

async function findPage(
  draftClient: StudioClient,
  rawClient: StudioClient,
  {
    siteId,
    locale,
    slug,
    parentId,
  }: {
    siteId: string
    locale: string
    slug: string
    parentId: string | null
  },
): Promise<TranslationRow | null> {
  /*
   * Resolve by Site + Locale + slug first, then compare
   * normalized parent IDs in TypeScript. This safely handles
   * draft/published document pairs.
   */
  const candidates = await draftClient.fetch<
    Array<{
      _id: string
      parent?: Reference
    }>
  >(
    `
      *[
        _type == "page" &&
        site._ref == $siteId &&
        locale == $locale &&
        slug == $slug
      ]{
        _id,
        parent
      }
    `,
    {
      siteId,
      locale,
      slug,
    },
  )

  const normalizedParentId = parentId ? cleanId(parentId) : null

  const document = candidates.find((candidate) => {
    const candidateParentId = cleanId(candidate.parent?._ref)

    if (normalizedParentId === null) {
      return candidateParentId === ''
    }

    return candidateParentId === normalizedParentId
  })

  if (!document?._id) {
    return null
  }

  const documentId = cleanId(document._id)

  return {
    locale,
    label: locale,
    state: await getDocumentStatus(rawClient, documentId),
    documentId,
  }
}

async function resolvePageTranslation(
  draftClient: StudioClient,
  rawClient: StudioClient,
  {
    siteId,
    locale,
    label,
    segments,
    isHomepage,
  }: {
    siteId: string
    locale: string
    label: string
    segments: string[]
    isHomepage: boolean
  },
): Promise<TranslationRow> {
  if (isHomepage) {
    const homepage = await findHomepage(draftClient, rawClient, siteId, locale)

    if (homepage) {
      return {
        ...homepage,
        label,
      }
    }

    return {
      locale,
      label,
      state: 'missing',
    }
  }

  let parentId: string | null = null

  for (let index = 0; index < segments.length; index++) {
    const slug = segments[index]
    const isLeaf = index === segments.length - 1

    const match = await findPage(draftClient, rawClient, {
      siteId,
      locale,
      slug,
      parentId,
    })

    if (!match && isLeaf) {
      return {
        locale,
        label,
        state: 'missing',
        targetParentId: parentId ?? undefined,
      }
    }

    if (!match) {
      const missingPath = `/${segments.slice(0, index + 1).join('/')}`

      return {
        locale,
        label,
        state: 'missing',
        reason: `Missing parent Page ${missingPath} will be created automatically.`,
      }
    }

    if (isLeaf) {
      return {
        ...match,
        label,
      }
    }

    parentId = match.documentId ?? null
  }

  return {
    locale,
    label,
    state: 'missing',
  }
}

/* =========================================================
 * Blogs
 * ======================================================= */

async function resolveBlogTranslation(
  draftClient: StudioClient,
  rawClient: StudioClient,
  {
    siteId,
    locale,
    label,
    slug,
  }: {
    siteId: string
    locale: string
    label: string
    slug: string
  },
): Promise<TranslationRow> {
  const document = await draftClient.fetch<{_id: string} | null>(
    `
      *[
        _type == "blog" &&
        site._ref == $siteId &&
        locale == $locale &&
        slug.current == $slug
      ][0]{
        _id
      }
    `,
    {
      siteId,
      locale,
      slug,
    },
  )

  if (!document?._id) {
    return {
      locale,
      label,
      state: 'missing',
    }
  }

  const documentId = cleanId(document._id)

  return {
    locale,
    label,
    state: await getDocumentStatus(rawClient, documentId),
    documentId,
  }
}

/* =========================================================
 * Keyed documents
 * ======================================================= */

async function resolveKeyedTranslation(
  draftClient: StudioClient,
  rawClient: StudioClient,
  {
    siteId,
    locale,
    label,
    documentType,
    key,
  }: {
    siteId: string
    locale: string
    label: string
    documentType: KeyedDocumentType
    key: string
  },
): Promise<TranslationRow> {
  const document = await draftClient.fetch<{_id: string} | null>(
    `
      *[
        _type == $documentType &&
        site._ref == $siteId &&
        locale == $locale &&
        key == $key
      ][0]{
        _id
      }
    `,
    {
      documentType,
      siteId,
      locale,
      key,
    },
  )

  if (!document?._id) {
    return {
      locale,
      label,
      state: 'missing',
    }
  }

  const documentId = cleanId(document._id)

  return {
    locale,
    label,
    state: await getDocumentStatus(rawClient, documentId),
    documentId,
  }
}

function buildReference(
  documentId: string,
  documentType: string,
  state: 'published' | 'draft' | 'changes',
): Reference {
  const reference: Reference = {
    _type: 'reference',
    _ref: cleanId(documentId),
  }

  /*
   * A draft-only target does not have a published document
   * for a normal strong reference yet.
   */
  if (state === 'draft') {
    reference._weak = true
    reference._strengthenOnPublish = {
      type: documentType,
    }
  }

  return reference
}

async function remapInternalPageLinks(
  value: unknown,
  draftClient: StudioClient,
  rawClient: StudioClient,
  siteId: string,
  targetLocale: string,
): Promise<unknown> {
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) =>
        remapInternalPageLinks(item, draftClient, rawClient, siteId, targetLocale),
      ),
    )
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const objectValue = value as Record<string, unknown>

  /*
   * All Header / Footer internal destinations use the shared
   * Link object:
   *
   * {
   *   type: "internal",
   *   internalPage: {_type: "reference", _ref: "..."}
   * }
   */
  if (objectValue.type === 'internal') {
    const internalPage = objectValue.internalPage as Reference | undefined
    const sourcePageId = cleanId(internalPage?._ref)

    if (sourcePageId) {
      const sourcePage = await getDocumentById(draftClient, sourcePageId, 'page')

      if (sourcePage) {
        const segments = await getSourcePageSegments(draftClient, sourcePage)

        const targetPage = await resolvePageTranslation(draftClient, rawClient, {
          siteId,
          locale: targetLocale,
          label: targetLocale,
          segments,
          isHomepage: sourcePage.isHomepage === true,
        })

        if (targetPage.documentId) {
          return {
            ...objectValue,

            internalPage: buildReference(
              targetPage.documentId,
              'page',
              targetPage.state as 'published' | 'draft' | 'changes',
            ),
          }
        }

        /*
         * Do not silently keep an English Page reference in a
         * translated Header / Footer. Leave the copied item in
         * place, but make its destination explicitly "No Link".
         */
        const noLinkValue: Record<string, unknown> = {
          ...objectValue,
          type: 'none',
        }

        delete noLinkValue.internalPage

        return noLinkValue
      }
    }
  }

  const entries = await Promise.all(
    Object.entries(objectValue).map(async ([key, childValue]) => [
      key,
      await remapInternalPageLinks(childValue, draftClient, rawClient, siteId, targetLocale),
    ]),
  )

  return Object.fromEntries(entries)
}

async function remapModalReferences(
  value: unknown,
  draftClient: StudioClient,
  rawClient: StudioClient,
  siteId: string,
  targetLocale: string,
): Promise<unknown> {
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) => remapModalReferences(item, draftClient, rawClient, siteId, targetLocale)),
    )
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const objectValue = value as Record<string, unknown>

  if (objectValue.actionType === 'modal') {
    const modalReference = objectValue.modal as Reference | undefined
    const sourceModalId = cleanId(modalReference?._ref)

    if (sourceModalId) {
      const sourceModal = await getDocumentById(draftClient, sourceModalId, 'modal')
      const modalKey = sourceModal?.key

      if (modalKey) {
        const targetModal = await resolveKeyedTranslation(draftClient, rawClient, {
          siteId,
          locale: targetLocale,
          label: targetLocale,
          documentType: 'modal',
          key: modalKey,
        })

        if (targetModal.documentId) {
          return {
            ...objectValue,
            modal: buildReference(
              targetModal.documentId,
              'modal',
              targetModal.state as 'published' | 'draft' | 'changes',
            ),
          }
        }
      }
    }
  }

  const entries = await Promise.all(
    Object.entries(objectValue).map(async ([key, childValue]) => [
      key,
      await remapModalReferences(childValue, draftClient, rawClient, siteId, targetLocale),
    ]),
  )

  return Object.fromEntries(entries)
}

async function createKeyedContentTranslation(
  client: StudioClient,
  draftClient: StudioClient,
  rawClient: StudioClient,
  source: TranslatableDocument,
  siteId: string,
  targetLocale: string,
  documentType: KeyedContentDocumentType,
): Promise<string> {
  const key = source.key

  if (!key) {
    throw new Error(`The ${documentType === 'modal' ? 'Modal' : 'Singleton'} is missing its Key.`)
  }

  const existing = await resolveKeyedTranslation(draftClient, rawClient, {
    siteId,
    locale: targetLocale,
    label: targetLocale,
    documentType,
    key,
  })

  if (existing.documentId) {
    return existing.documentId
  }

  let value = buildTranslationDocument(source, documentType, targetLocale)

  value = (await remapInternalPageLinks(
    value,
    draftClient,
    rawClient,
    siteId,
    targetLocale,
  )) as Record<string, unknown> & {
    _id: string
    _type: TranslatableType
  }

  value = (await remapModalReferences(
    value,
    draftClient,
    rawClient,
    siteId,
    targetLocale,
  )) as Record<string, unknown> & {
    _id: string
    _type: TranslatableType
  }

  const created = await client.create(value)

  return cleanId(created._id)
}

async function createNavigationTranslation(
  client: StudioClient,
  draftClient: StudioClient,
  rawClient: StudioClient,
  source: TranslatableDocument,
  siteId: string,
  targetLocale: string,
  documentType: NavigationDocumentType,
): Promise<string> {
  const key = source.key

  if (!key) {
    throw new Error('The Navigation document is missing its Key.')
  }

  const existing = await resolveKeyedTranslation(draftClient, rawClient, {
    siteId,
    locale: targetLocale,
    label: targetLocale,
    documentType,
    key,
  })

  if (existing.documentId) {
    return existing.documentId
  }

  if (documentType === 'navigationSet') {
    const value = buildTranslationDocument(source, documentType, targetLocale)

    delete value.header
    delete value.footer

    if (source.headerMode !== 'none' && source.header?._ref) {
      const sourceHeader = await getDocumentById(
        draftClient,
        cleanId(source.header._ref),
        'navigationHeader',
      )

      if (!sourceHeader) {
        throw new Error('The source Header Navigation could not be resolved.')
      }

      const targetHeaderId = await createNavigationTranslation(
        client,
        draftClient,
        rawClient,
        sourceHeader,
        siteId,
        targetLocale,
        'navigationHeader',
      )

      const targetHeaderState = await getDocumentStatus(rawClient, targetHeaderId)

      value.header = buildReference(targetHeaderId, 'navigationHeader', targetHeaderState)
    }

    if (source.footerMode !== 'none' && source.footer?._ref) {
      const sourceFooter = await getDocumentById(
        draftClient,
        cleanId(source.footer._ref),
        'navigationFooter',
      )

      if (!sourceFooter) {
        throw new Error('The source Footer Navigation could not be resolved.')
      }

      const targetFooterId = await createNavigationTranslation(
        client,
        draftClient,
        rawClient,
        sourceFooter,
        siteId,
        targetLocale,
        'navigationFooter',
      )

      const targetFooterState = await getDocumentStatus(rawClient, targetFooterId)

      value.footer = buildReference(targetFooterId, 'navigationFooter', targetFooterState)
    }

    const created = await client.create(value)

    return cleanId(created._id)
  }

  let value = buildTranslationDocument(source, documentType, targetLocale)

  value = (await remapInternalPageLinks(
    value,
    draftClient,
    rawClient,
    siteId,
    targetLocale,
  )) as Record<string, unknown> & {
    _id: string
    _type: TranslatableType
  }

  const created = await client.create(value)

  return cleanId(created._id)
}

/* =========================================================
 * Document creation
 * ======================================================= */

function TranslationBadge({state}: {state: TranslationState}) {
  switch (state) {
    case 'current':
      return <Badge tone="primary">Current</Badge>

    case 'published':
      return <Badge tone="positive">Published</Badge>

    case 'draft':
      return <Badge tone="caution">Draft</Badge>

    case 'changes':
      return <Badge tone="caution">Draft changes</Badge>

    default:
      return <Badge>Not translated</Badge>
  }
}

function EditTranslationButton({
  documentId,
  documentType,
}: {
  documentId: string
  documentType: TranslatableType
}) {
  const {href, onClick} = useIntentLink({
    intent: 'edit',
    params: {
      id: documentId,
      type: documentType,
    },
  })

  return <Button as="a" href={href} onClick={onClick} mode="ghost" text="Edit Translation" />
}

function createDraftId(): string {
  return `drafts.${crypto.randomUUID()}`
}

function buildTranslationDocument(
  source: TranslatableDocument,
  documentType: TranslatableType,
  targetLocale: string,
  targetParentId?: string,
  targetParentIsDraftOnly = false,
): Record<string, unknown> & {
  _id: string
  _type: TranslatableType
} {
  const value = {
    ...source,
  } as Record<string, unknown>

  delete value._id
  delete value._rev
  delete value._createdAt
  delete value._updatedAt
  delete value._originalId

  value._id = createDraftId()
  value._type = documentType

  value.site = {
    _type: 'reference',
    _ref: cleanId(source.site?._ref),
  }

  value.locale = targetLocale

  if (documentType === 'page') {
    /*
     * Navigation is locale-specific.
     * Let the translated Page inherit the target locale's
     * default Navigation Set rather than copying an override.
     */
    delete value.navigation

    /*
     * Never copy the source locale's parent reference.
     * The target Parent Page is resolved from the same
     * relative route in the target locale.
     */
    delete value.parent

    if (source.isHomepage !== true && targetParentId) {
      const parentReference: Reference = {
        _type: 'reference',
        _ref: cleanId(targetParentId),
      }

      if (targetParentIsDraftOnly) {
        parentReference._weak = true
        parentReference._strengthenOnPublish = {
          type: 'page',
        }
      }

      value.parent = parentReference
    }
  }

  /*
   * Blog Taxonomy and Author references are intentionally retained.
   *
   * Both are now locale-neutral at the document level:
   *
   * - Taxonomy represents one shared concept per Site.
   * - Author represents one shared person per Site.
   *
   * Locale-specific display fields are embedded inside those
   * referenced documents, so a translated Blog should keep the
   * exact same taxonomy and author references.
   */

  return value as Record<string, unknown> & {
    _id: string
    _type: TranslatableType
  }
}

async function createPageTranslationWithAncestors(
  client: StudioClient,
  draftClient: StudioClient,
  rawClient: StudioClient,
  source: TranslatableDocument,
  siteId: string,
  targetLocale: string,
): Promise<string> {
  if (source.isHomepage === true) {
    const existingHomepage = await findHomepage(draftClient, rawClient, siteId, targetLocale)

    if (existingHomepage?.documentId) {
      return existingHomepage.documentId
    }

    const createdHomepage = await client.create(
      buildTranslationDocument(source, 'page', targetLocale),
    )

    return cleanId(createdHomepage._id)
  }

  const sourceChain = await getSourcePageChain(draftClient, source)

  let targetParentId: string | null = null
  let targetParentIsDraftOnly = false

  for (const sourcePage of sourceChain) {
    const slug = getPageSlug(sourcePage)

    if (!slug) {
      throw new Error('A Page in the current hierarchy is missing its URL Segment.')
    }

    const existingTargetPage = await findPage(draftClient, rawClient, {
      siteId,
      locale: targetLocale,
      slug,
      parentId: targetParentId,
    })

    if (existingTargetPage?.documentId) {
      targetParentId = existingTargetPage.documentId
      targetParentIsDraftOnly = existingTargetPage.state === 'draft'
      continue
    }

    const createdTargetPage = await client.create(
      buildTranslationDocument(
        sourcePage,
        'page',
        targetLocale,
        targetParentId ?? undefined,
        targetParentIsDraftOnly,
      ),
    )

    targetParentId = cleanId(createdTargetPage._id)
    targetParentIsDraftOnly = true
  }

  if (!targetParentId) {
    throw new Error('Unable to create the translated Page hierarchy.')
  }

  return targetParentId
}

/* =========================================================
 * Action
 * ======================================================= */

export const ShowTranslationsAction: DocumentActionComponent = (props) => {
  const client = useClient({
    apiVersion: API_VERSION,
  })

  const draftClient = useMemo(
    () =>
      client.withConfig({
        perspective: 'drafts',
      }),
    [client],
  )

  const rawClient = useMemo(
    () =>
      client.withConfig({
        perspective: 'raw',
      }),
    [client],
  )

  const {navigateIntent} = useRouter()

  const source = (props.draft ?? props.published) as TranslatableDocument | null

  const documentType = props.type as TranslatableType

  const [isOpen, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rows, setRows] = useState<TranslationRow[]>([])
  const [creatingLocale, setCreatingLocale] = useState<string | null>(null)

  const siteId = cleanId(source?.site?._ref)
  const currentLocale = source?.locale ?? ''

  const pageSlug = source ? getPageSlug(source) : undefined
  const blogSlug = source ? getBlogSlug(source) : undefined
  const documentKey = source?.key ?? ''

  const isHomepage = source?.isHomepage === true

  const routingReady = Boolean(
    source &&
    siteId &&
    currentLocale &&
    (documentType === 'page'
      ? isHomepage || pageSlug
      : documentType === 'blog'
        ? blogSlug
        : isKeyedDocumentType(documentType)
          ? documentKey
          : false),
  )

  useEffect(() => {
    if (!isOpen || !source || !routingReady) {
      return
    }

    const sourceDocument = source
    let cancelled = false

    async function loadTranslations() {
      setLoading(true)
      setLoadError(null)
      setActionError(null)

      try {
        const site = await draftClient.fetch<SiteDocument | null>(
          `
            *[
              _type == "site" &&
              _id == $siteId
            ][0]{
              locales[]{
                code,
                label
              }
            }
          `,
          {
            siteId,
          },
        )

        const locales = (site?.locales ?? []).filter(
          (
            locale,
          ): locale is SiteLocale & {
            code: string
          } => Boolean(locale.code),
        )

        let segments: string[] = []

        if (documentType === 'page') {
          segments = await getSourcePageSegments(draftClient, sourceDocument)
        }

        const translations = await Promise.all(
          locales.map(async (locale): Promise<TranslationRow> => {
            const code = locale.code
            const label = locale.label ?? code

            if (code === currentLocale) {
              return {
                locale: code,
                label,
                state: 'current',
              }
            }

            if (documentType === 'page') {
              return resolvePageTranslation(draftClient, rawClient, {
                siteId,
                locale: code,
                label,
                segments,
                isHomepage,
              })
            }

            if (documentType === 'blog') {
              return resolveBlogTranslation(draftClient, rawClient, {
                siteId,
                locale: code,
                label,
                slug: blogSlug ?? '',
              })
            }

            if (isKeyedDocumentType(documentType)) {
              return resolveKeyedTranslation(draftClient, rawClient, {
                siteId,
                locale: code,
                label,
                documentType,
                key: documentKey,
              })
            }

            return {
              locale: code,
              label,
              state: 'missing',
            }
          }),
        )

        if (!cancelled) {
          setRows(translations)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to resolve translations.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadTranslations()

    return () => {
      cancelled = true
    }
  }, [
    isOpen,
    source,
    routingReady,
    documentType,
    siteId,
    currentLocale,
    pageSlug,
    blogSlug,
    documentKey,
    isHomepage,
    draftClient,
    rawClient,
  ])

  async function createTranslation(row: TranslationRow) {
    if (!source || !routingReady || row.state !== 'missing') {
      return
    }

    const sourceDocument = source

    setCreatingLocale(row.locale)
    setActionError(null)

    try {
      if (documentType === 'page') {
        const documentId = await createPageTranslationWithAncestors(
          client,
          draftClient,
          rawClient,
          sourceDocument,
          siteId,
          row.locale,
        )

        setOpen(false)

        navigateIntent('edit', {
          id: documentId,
          type: documentType,
        })

        return
      }

      if (documentType === 'blog') {
        const latestRow = await resolveBlogTranslation(draftClient, rawClient, {
          siteId,
          locale: row.locale,
          label: row.label,
          slug: blogSlug ?? '',
        })

        if (latestRow.documentId) {
          setOpen(false)

          navigateIntent('edit', {
            id: latestRow.documentId,
            type: documentType,
          })

          return
        }

        const translationDocument = buildTranslationDocument(
          sourceDocument,
          documentType,
          row.locale,
        )

        const created = await client.create(translationDocument)

        setOpen(false)

        navigateIntent('edit', {
          id: cleanId(created._id),
          type: documentType,
        })

        return
      }

      if (isKeyedContentDocumentType(documentType)) {
        const documentId = await createKeyedContentTranslation(
          client,
          draftClient,
          rawClient,
          sourceDocument,
          siteId,
          row.locale,
          documentType,
        )

        setOpen(false)

        navigateIntent('edit', {
          id: documentId,
          type: documentType,
        })
        return
      }

      if (isNavigationDocumentType(documentType)) {
        const documentId = await createNavigationTranslation(
          client,
          draftClient,
          rawClient,
          sourceDocument,
          siteId,
          row.locale,
          documentType,
        )

        setOpen(false)

        navigateIntent('edit', {
          id: documentId,
          type: documentType,
        })
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to create the translation.')
    } finally {
      setCreatingLocale(null)
    }
  }

  if (
    documentType !== 'page' &&
    documentType !== 'blog' &&
    documentType !== 'singleton' &&
    documentType !== 'modal' &&
    documentType !== 'navigationHeader' &&
    documentType !== 'navigationFooter' &&
    documentType !== 'navigationSet'
  ) {
    return null
  }

  return {
    label: 'Show Translations',
    icon: EarthGlobeIcon,
    group: ['paneActions'],

    disabled: !routingReady,

    title: routingReady
      ? 'View, create, or edit translations for this document.'
      : documentType === 'page' || documentType === 'blog'
        ? 'Set the Site, Locale, and URL fields before managing translations.'
        : 'Set the Site, Locale, and Key before managing translations.',

    onHandle: () => {
      setOpen(true)
    },

    dialog: isOpen
      ? {
          type: 'dialog',
          header: 'Translations',

          onClose: () => {
            setOpen(false)
          },

          content: (
            <Box padding={4}>
              <Stack gap={4}>
                {loading && (
                  <Flex align="center" justify="center" padding={4}>
                    <Spinner />
                  </Flex>
                )}

                {loadError && (
                  <Card padding={3} radius={2} tone="critical">
                    <Text>{loadError}</Text>
                  </Card>
                )}

                {actionError && (
                  <Card padding={3} radius={2} tone="critical">
                    <Text>{actionError}</Text>
                  </Card>
                )}

                {!loading && !loadError && isNavigationDocumentType(documentType) && (
                  <Card padding={3} radius={2}>
                    <Text muted size={1}>
                      Internal Page links are mapped to the matching target-locale Page when it
                      exists. Missing Page translations are copied as No Link so this Navigation
                      does not silently point visitors back to another locale.
                    </Text>
                  </Card>
                )}

                {!loading && !loadError && rows.length === 0 && (
                  <Card padding={3} radius={2}>
                    <Text muted>No supported locales were found for this Site.</Text>
                  </Card>
                )}

                {!loading &&
                  !loadError &&
                  rows.map((row) => {
                    const isCreating = creatingLocale === row.locale
                    const anotherTranslationIsCreating = Boolean(creatingLocale) && !isCreating

                    return (
                      <Card key={row.locale} border padding={3} radius={2}>
                        <Stack gap={4}>
                          <Flex align="center" justify="space-between">
                            <Stack gap={3}>
                              <Text weight="semibold">{row.label}</Text>
                              <Text muted size={1}>
                                {row.locale}
                              </Text>
                            </Stack>

                            <TranslationBadge state={row.state} />
                          </Flex>

                          {row.reason && (
                            <Text muted size={1}>
                              {row.reason}
                            </Text>
                          )}

                          {row.state === 'current' && (
                            <Text muted size={1}>
                              You are editing this locale.
                            </Text>
                          )}

                          {row.documentId && row.state !== 'current' && (
                            <EditTranslationButton
                              documentId={row.documentId}
                              documentType={documentType}
                            />
                          )}

                          {row.state === 'missing' && (
                            <Button
                              disabled={anotherTranslationIsCreating || isCreating}
                              mode="ghost"
                              tone="primary"
                              text={isCreating ? 'Creating Translation…' : 'Create Translation'}
                              onClick={() => {
                                void createTranslation(row)
                              }}
                            />
                          )}
                        </Stack>
                      </Card>
                    )
                  })}
              </Stack>
            </Box>
          ),
        }
      : undefined,
  }
}
