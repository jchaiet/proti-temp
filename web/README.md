# Proti Web

The Proti Web package is the Next.js application for the Website + CMS Starter. It resolves content from Sanity, renders Mino UI components, supports localized routes, search, Draft Mode/visual editing, webhook-driven cache revalidation, and Playwright regression testing.

See also the repository-level [Architecture](../docs/ARCHITECTURE.md), [SEO/GEO](../docs/SEO_GEO.md), [Testing](../docs/TESTING.md), and [Deployment](../docs/DEPLOYMENT.md) guides.

## Technology

The current package includes:

- Next.js
- React
- next-sanity
- Mino UI
- Vitest
- Playwright

Use `package.json` as the source of truth for exact versions.

## Install

From the Web directory:

```bash
pnpm install
```

The package currently references Mino UI through a local tarball:

```text
mino-ui-0.0.3.tgz
```

Make sure that file is present at the expected path before installing dependencies.

## Environment Variables

Copy:

```bash
cp .env.example .env.local
```

Configure:

### `NEXT_SANITY_PROJECT_ID`

Sanity project ID used by the Web application's Sanity client.

### `NEXT_SANITY_DATASET`

Sanity dataset used by the Web application.

### `NEXT_SANITY_STUDIO_URL`

URL to the matching Sanity Studio. Locally this is normally:

```text
http://localhost:3333
```

It is used by Sanity visual editing/source-map behavior.

### `SANITY_API_READ_TOKEN`

Server-side Sanity read token.

It is required for Draft Mode/draft perspective reads. Do not expose this value through a `NEXT_PUBLIC_*` variable.

### `SANITY_API_WRITE_TOKEN`

Server-side Sanity write token used by features that write back to Sanity, such as Poll voting.

Do not expose this value to the browser.

### `SANITY_REVALIDATE_SECRET`

Shared secret used to verify signed Sanity revalidation webhook requests.

The deployed webhook and Web environment must use the same secret.

## Development

```bash
pnpm dev
```

The local site normally runs at:

```text
http://localhost:3000
```

Proti resolves the active Site from the request host/domain. If the Site document contains `localhost:3000`, browse and test with `localhost:3000`; `127.0.0.1:3000` is a different host.

### Development caching

Published Sanity reads bypass the persistent production cache while `NODE_ENV=development`, so published Studio changes should appear locally after a normal refresh.

Production builds intentionally keep the persistent cache and rely on the Sanity revalidation webhook.

## Production Build

```bash
pnpm build
pnpm start
```

A local production build is useful for final routing, caching, and Playwright validation.

Do not expect a local `pnpm start` server to automatically receive a remotely-triggered Sanity webhook unless that local server is publicly reachable. Verify real webhook behavior against a deployed environment.

## Routing and Locales

Proti uses host-based Site resolution and locale-aware public URLs.

The default locale has no locale prefix:

```text
/products/widget
```

Additional locales use a prefix:

```text
/us-es/products/widget
```

Translated content should keep the same logical path when possible.

### Language selector

The language selector represents exact translations of the current route:

- Existing alternate translation: show it.
- Missing alternate translation: do not show it.
- No additional translations: hide the language selector.
- Do not redirect a missing translation to the alternate locale homepage.

Query strings are preserved when switching between exact translations.

## Sanity Draft Mode and Visual Editing

Draft Mode uses the Sanity drafts perspective and requires `SANITY_API_READ_TOKEN`.

Published reads use the published perspective. Draft reads use Sanity Live so Presentation/visual editing can update without a manual refresh.

The Studio URL is taken from `NEXT_SANITY_STUDIO_URL`, with local Studio typically running at `http://localhost:3333`.

## Cache Revalidation

Production published reads are cached until invalidated by the Sanity publish webhook.

The endpoint is:

```text
POST /api/revalidate
```

The route validates the signed Sanity webhook with `SANITY_REVALIDATE_SECRET` and computes all affected paths before calling Next.js `revalidatePath()`.

Webhook configuration is defined in:

```text
src/cms/revalidation/webhook.ts
```

That file exports the canonical webhook filter and projection.

When configuring the Sanity document webhook:

- Use the deployed `/api/revalidate` URL.
- Use the same secret as `SANITY_REVALIDATE_SECRET`.
- Keep **Include drafts** disabled.
- Keep **Include versions** disabled.
- Use the exported filter/projection from `src/cms/revalidation/webhook.ts`.

The projection includes both `before()` and `after()` states so route changes, deletes, locale changes, and similar updates can invalidate old and new paths.

## Search

Search uses visible CMS content rather than matching arbitrary rendered HTML/scripts.

Search behavior includes:

- Locale-aware results
- Taxonomy metadata
- Author metadata
- URL/query parameter state
- Relevance and supported sort modes

Use:

```bash
pnpm test:search
```

for the focused Search test suite.

## Document Lists

Document Lists support both manually selected and dynamically resolved content.

Dynamic lists support:

- Content types
- Initial taxonomy restrictions
- Initial sort
- Search
- Visitor filter groups
- Standard and custom sorting
- Pagination
- Empty/initial state messages

### Require Search or Filter

When **Require Search or Filter** is enabled, the Document List stays in its initial state until the visitor supplies at least one meaningful input.

Any of the following starts the result set:

- a non-empty search query
- an active standard visitor filter
- an active taxonomy Filter Group selection

A filter-only request uses the full eligible dynamic scope. Selecting an `All`/reset option does not count as an active filter.

If a search/filter runs and produces zero matches, the normal empty-state message is shown rather than the initial-state prompt.

### Taxonomy filter groups

Visitor taxonomy filters are explicit groups.

Example:

```text
Type
- Article
- Video

Treatment
- Asthma
- Diabetes
```

Each group controls:

- Display title
- Single vs Multiple selection
- Any vs All matching within that group
- Selected Taxonomy Terms

Different groups combine using AND semantics.

For example:

```text
(Type = Article OR Video)
AND
(Treatment = Asthma OR Diabetes)
```

### Sorting

Standard visitor sort options include:

- Relevance
- Newest
- Oldest
- Title A–Z
- Title Z–A

Custom sorts are restricted to supported/whitelisted fields and directions rather than arbitrary GROQ.

Use:

```bash
pnpm test:document-list
```

for focused Document List coverage.

## Responsive Grid Blocks

CMS Grid blocks interpret the numeric `cols` value as the desktop column count.

Mino GridBlock derives the default responsive columns as:

```text
sm: 1
md: min(desktop columns, 2)
lg: configured desktop columns
```

Examples:

```text
Desktop 1 → 1 / 1 / 1
Desktop 2 → 1 / 2 / 2
Desktop 3 → 1 / 2 / 3
Desktop 4 → 1 / 2 / 4
```

The core Mino `Grid` component keeps its original scalar semantics. Explicit responsive column objects passed directly to Mino bypass the CMS default behavior.

## Shared Block Styles

CMS blocks can project a shared `styles` configuration that is applied at the `BlockRenderer` boundary.

Supported controls are:

### Vertical Padding

- Default
- None
- Small
- Medium
- Large
- Extra Large
- 2× Extra Large
- 3× Extra Large

A non-default value replaces the block's existing vertical padding.

### Background

Current semantic options are:

- Default
- Canvas
- Surface
- Brand Subtle

Background styling is applied to the full-width block wrapper.

### Content Width

- Default
- Narrow
- Standard
- Wide
- Full Width

Content-width overrides reuse Mino's existing container/customization variables. Rich Text keeps its own reading-width behavior unless the shared Block Styles value explicitly overrides it.

When all shared style values are `Default`, the renderer preserves the original component output without adding a styling wrapper.

## Tests

### Main Vitest suite

Interactive/watch mode:

```bash
pnpm test
```

One complete run:

```bash
pnpm test:run
```

### Focused suites

```bash
pnpm test:routing
pnpm test:search
pnpm test:document-list
pnpm test:seo
pnpm test:seo-output
pnpm test:revalidation
```

### TypeScript

```bash
pnpm exec tsc --noEmit
```

### Lint

```bash
pnpm lint
```

### Production build

```bash
pnpm build
```

## Playwright

Playwright covers:

- Chromium desktop
- Chromium mobile emulation
- Firefox desktop

Visual regression screenshots use Chromium desktop/mobile. Firefox is used for functional cross-browser coverage.

Install the managed browsers after installing dependencies:

```bash
pnpm exec playwright install chromium firefox
```

### E2E environment

Copy:

```bash
cp e2e/.env.e2e.example e2e/.env.e2e
```

A typical local configuration is:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_SKIP_WEBSERVER=1

E2E_HOME_PATH=/
```

Add additional real routes for Pages, Blogs, Authors, Search, Taxonomy, and secondary locales as available in the current Sanity dataset.

`e2e/.env.e2e` should not be committed. `e2e/.env.e2e.example` should be committed.

### Smoke tests

```bash
pnpm test:e2e:smoke
```

Smoke tests validate configured routes across Chromium desktop, Chromium mobile, and Firefox desktop.

### Canonical visual baseline

Visual baselines should be created and compared using the production Next.js build.

Terminal 1:

```bash
pnpm build
pnpm start
```

With `PLAYWRIGHT_SKIP_WEBSERVER=1`, use Terminal 2:

```bash
pnpm test:e2e:smoke
pnpm test:e2e:visual
```

### First-time visual baseline

With the production build running:

```bash
pnpm test:e2e:smoke
pnpm test:e2e:update
```

Review every generated screenshot before committing it.

Then:

```bash
pnpm test:e2e:visual
```

### Normal visual-regression workflow

Start from a clean passing baseline:

```bash
pnpm test:e2e:smoke
pnpm test:e2e:visual
```

Make the component/style change, then run:

```bash
pnpm test:e2e:smoke
pnpm test:e2e:visual
```

If a visual test fails:

1. Inspect the actual/diff screenshots.
2. If the change is unintended, fix the code and rerun.
3. If the visual change is intentional, run:

```bash
pnpm test:e2e:update
```

4. Review the updated baselines.
5. Commit the code change and screenshot baselines together.
6. Run `pnpm test:e2e:visual` again.

Do not run `test:e2e:update` first after making a UI change; doing so would approve the new appearance before reviewing the regression.

### Playwright report

```bash
pnpm test:e2e:report
```

Interactive UI mode:

```bash
pnpm test:e2e:ui
```

## Release Validation

Before deployment:

```bash
pnpm test:run
pnpm exec tsc --noEmit
pnpm build
pnpm lint
```

Then run Playwright against the production build:

```bash
pnpm test:e2e:smoke
pnpm test:e2e:visual
```

After deployment, verify Sanity publish/revalidation behavior for representative Pages, Blogs, Authors, Navigation, translations, and taxonomy-driven content.
