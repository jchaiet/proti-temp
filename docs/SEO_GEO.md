# SEO, structured data and GEO discoverability — v0.3.0

Proti's v0.3 batches brought locale/hreflang, canonical origin, Author locale integrity, JSON-LD entity relationships, and semantic markup under one tested contract. This guide documents **implementation mechanisms**, not a promise of search-engine ranking or generative-engine citation.

## Where each part lives

| Responsibility                                                  | Implementation                                                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Metadata title, description, canonical, robots, social metadata | `web/src/cms/resolvers/seo.ts`                                                                                            |
| Public origin, locale prefixes, URL normalization               | `web/src/lib/routing/public-url.ts`                                                                                       |
| Page/Blog exact translation lookup                              | `web/src/cms/resolvers/translation.ts`                                                                                    |
| Locale parsing and HTML language tag conversion                 | `web/src/lib/routing/locale.ts`                                                                                           |
| Site Organization and per-locale SEO defaults                   | `studio/schemaTypes/documents/siteType.ts`, `objects/siteSeoDefaultsType.ts`, `objects/organizationStructuredDataType.ts` |
| JSON-LD objects and stable entity IDs                           | `web/src/cms/resolvers/structured-data.ts`                                                                                |
| Breadcrumb hierarchy                                            | `web/src/cms/resolvers/structured-data-breadcrumbs.ts`                                                                    |
| Route metadata and JSON-LD assembly                             | `web/src/app/[[...path]]/page.tsx`                                                                                        |
| Sitemap and robots rules                                        | `web/src/cms/resolvers/search-engine.ts`, `web/src/app/sitemap.ts`, `robots.ts`                                           |
| Editorial heading/image quality                                 | `studio/schemaTypes/validation/headingQuality.ts`, `imageAccessibility.ts`                                                |

## Canonical URL contract

Site `canonicalDomain` is authoritative when set. The URL helper falls back to a configured Site domain when the canonical field is missing. The default locale has no URL prefix; other locales use their code. Canonical overrides are available in a document's SEO object and should be used deliberately. An override to another URL does not make two pages equivalent translations.

Example for a Site with canonical host `example.com`, default `en-us`, alternate `es-us`:

```text
https://example.com/products/widget
https://example.com/es-us/products/widget
```

The origin helper uses HTTPS for public hosts and HTTP for recognized localhost hosts. Domain configuration must reflect your actual deployment.

## Locale and discoverability

The translation resolver resolves valid alternate paths and builds language alternates. Hreflang should not advertise missing pages. Author profiles use a shared Author document, but localized availability is calculated from translated fields rather than simply assuming every Site locale has a complete profile. Site/locale routing and canonical redirects keep the default prefix out of public canonical paths.

## Page-level editorial metadata

The shared SEO object supports meta title, meta description, social image, canonical URL override, indexing, and following. Site has per-locale defaults for titles/descriptions and robots behavior. Editors should write unique summaries and accessible image alt text instead of relying solely on defaults.

## JSON-LD entity graph

`structured-data.ts` builds and links recognized entities with stable `@id` identifiers, including:

- `Organization` and `WebSite` at the Site origin;
- `WebPage` for a standard page and `ProfilePage`/`Person` for an Author;
- `BlogPosting` for Blog details, with author/reviewer and editorial attributes when present;
- `CollectionPage` for applicable listing/taxonomy experiences;
- `BreadcrumbList` for routed hierarchies, and primary image references when available.

Author schemas can describe credentials, expertise, affiliation, and external identity URLs; Blog schemas can include citations/sources, published/modified/reviewed dates, and links to referenced entities when valid content is present. Do not invent credentials or affiliations merely to populate markup.

The renderer component is `web/src/components/StructuredData/StructuredData.tsx`. JSON-LD entity relationships depend on **consistent absolute canonical URLs**; changing a Site canonical domain is a cross-page SEO change.

## Semantic content for search and answer systems

- Use a meaningful H1 and progressive section headings where appropriate; Sanity Portable Text heading levels directly control rendered semantics.
- Prefer readable, specific content with visible citations, reviewer details and dates when applicable.
- Ensure images with informative content have useful alt text and that link labels are meaningful.
- Search operates on visible CMS content, not arbitrary script/HTML matches (`web/src/cms/search/visible-text.ts`).
- Validate actual server-rendered HTML, not only client-updated markup.

## Validation procedure

1. On published Page, Blog, and Author routes, inspect **View Page Source** for canonical, hreflang, robots, title/description and JSON-LD.
2. Compare default and alternate locale URLs; verify that only existing equivalents are advertised.
3. Inspect `html lang` and the heading hierarchy in the browser.
4. Validate JSON-LD shape with a schema validator. A valid graph does not guarantee rich results.
5. Review `robots.txt` and `sitemap.xml` on the deployed Site, especially after Site canonical-domain or robots changes.
6. Run from `web/`:

```bash
pnpm test:seo
pnpm test:seo-output
pnpm test:revalidation
```

Also include `pnpm test:e2e` in the full release gate.
