# Proti architecture (v0.3.0)

Proti is a multi-site, multi-locale website starter. **Web** renders public experiences with Next.js and Mino UI; **Studio** owns Sanity content modeling and editorial workflows; **scripts** initialize, seed and validate a new implementation. See the root [README](../README.md) for installation.

## Repository responsibilities

| Area                    | Responsibility                                               | Implementation entry points                               |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| `web/src/app`           | Public routes, metadata, sitemap, robots, API routes         | `[[...path]]/page.tsx`, `sitemap.ts`, `robots.ts`, `api/` |
| `web/src/sanity`        | Sanity client, GROQ fragments/queries, fetch and caching     | `client.ts`, `fetch.ts`, `queries/`, `fragments/`         |
| `web/src/cms/resolvers` | Convert CMS documents into route- and component-ready models | `route.ts`, `page.ts`, `blog.ts`, `author.ts`, `seo.ts`   |
| `web/src/cms/mappers`   | Map CMS block/card/CTA shapes to Mino UI props               | `blocks/`, `cards/`, `cta-group.ts`                       |
| `web/src/components`    | Site shell, page templates, block rendering, modals          | `SiteLayout/`, `BlockRenderer/`, `Blog/`, `Author/`       |
| `studio/schemaTypes`    | Document, block, object, and form schemas and validation     | `documents/`, `blocks/`, `objects/`, `forms/`             |
| `studio/structure`      | Site/locale-focused editorial navigation                     | `index.ts` and section modules                            |
| `studio/actions`        | Creation and resolution of translated documents              | `ShowTranslationsAction.tsx`                              |
| `scripts`               | Implementation initialization, Site seeding, diagnostics     | `proti-init.mjs`, `proti-seed.mjs`, `proti-check.mjs`     |

## Request → rendered page

1. A request reaches the Next.js optional catch-all route, `web/src/app/[[...path]]/page.tsx`.
2. Request host selects the Site via `web/src/sanity/queries/site.ts`. **Site domains are hostnames**; `localhost` and `127.0.0.1` are different host matches.
3. `web/src/lib/routing/locale.ts` interprets an optional locale prefix. The Site default locale has **no public prefix**.
4. `web/src/cms/resolvers/route.ts` applies route precedence: CMS redirect → explicitly prefixed default-locale canonical redirect → Author → Blog taxonomy → Blog detail → Page → not found. Reserved content routes do not fall through to arbitrary Pages.
5. Sanity queries load published (or Draft Mode) content. CMS resolvers and mappers create models consumed by templates and `BlockRenderer`.
6. Metadata and JSON-LD are built separately from page rendering. `SiteLayout` composes navigation, header utilities, and modals.

## Data and ownership boundaries

- **Site**: domain/canonical origin, locales/default locale, navigation assignments, per-locale SEO defaults, Organization entity data.
- **Page**: hierarchical Site + Locale routing, SEO and authored sections.
- **Blog**: Site + Locale + slug, editorial fields, references and sections.
- **Author**: one Site-scoped identity with default-locale fields plus localized translation entries, not one separate Author document per language.
- **Taxonomy**: hierarchical, Site-scoped terms/groups with localized display values and independent blog-tag/filter visibility.
- **Navigation Set**: Site + Locale assignment of Header and Footer Navigation.
- **Modal / Singleton**: keyed reusable content.

See [Content Model](CONTENT_MODEL.md), [Translations](TRANSLATIONS.md), and [Components](COMPONENTS.md).

## Published, draft, and cache behavior

`web/src/sanity/fetch.ts` uses published perspective for ordinary requests. During local development, published fetches opt out of persistent caching. Production published fetches use caching that the Sanity webhook invalidates. Draft Mode requires a server-side read token and uses Sanity Live for Presentation/visual editing. The public revalidation API validates a signed webhook and invalidates affected paths, including dependencies and old/new paths for route changes.

Do not use a local `pnpm start` instance as proof that a remotely configured webhook works; verify webhook updates on the deployed endpoint. See [Deployment](DEPLOYMENT.md).

## Extending Proti safely

A new CMS-driven block typically requires: Sanity object schema registration → GROQ projection/fragment → CMS type → mapper/resolver → rendering component/BlockRenderer registration → tests. Update both Studio and Web when the authoring contract changes. Prefer existing Mino semantic tokens and shared block-style/CTA objects over component-specific hardcoded controls.

## Related tests

- Routing and locale logic: `web/src/lib/routing/` and `web/src/cms/resolvers/` tests.
- SEO: `web/src/cms/resolvers/seo.test.ts`, `structured-data.test.ts` and integration tests.
- Webhook impact: `web/src/cms/revalidation/` and `web/src/app/api/revalidate/route.test.ts`.
- Browser behavior: `web/e2e/smoke.spec.ts`, `visual.spec.ts`.

Run instructions: [Testing](TESTING.md).
