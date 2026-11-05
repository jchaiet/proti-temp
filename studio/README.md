# Proti Sanity Studio

See the repository [Editor Guide](../docs/EDITOR_GUIDE.md), [Content Model](../docs/CONTENT_MODEL.md), and [Translations](../docs/TRANSLATIONS.md).

This package is the Sanity Content Studio for Proti. It defines the content model, authoring structure, translation actions, validation, navigation, taxonomy, reusable blocks, and CMS-side configuration used by the Next.js Web application.

## Install

From the Studio directory:

```bash
pnpm install
```

## Environment Configuration

Studio reads its configuration from `studio/sanity.config.ts`:

- `SANITY_STUDIO_PROJECT_ID` (required)
- `SANITY_STUDIO_DATASET` (defaults to `production`)
- `SANITY_STUDIO_TITLE` (optional)
- `SANITY_STUDIO_PREVIEW_URL` (defaults to `http://localhost:3000`)

The root `pnpm proti:init` workflow writes `studio/.env.local` and `web/.env.local`. Do not commit real credentials. The uploaded documentation source archive did not contain a Studio example-env template; verify placeholder templates separately in the release repository. See [Configuration](../docs/CONFIGURATION.md).

## Development

```bash
pnpm dev
```

The Studio normally runs at:

```text
http://localhost:3333
```

## Build and Deploy

Build Studio:

```bash
pnpm build
```

Deploy Studio:

```bash
pnpm deploy
```

Deploy the Sanity GraphQL API when intentionally required:

```bash
pnpm deploy-graphql
```

## Tests

Run the Studio Vitest suite:

```bash
pnpm test
```

Also run the Studio build before merging schema/configuration changes:

```bash
pnpm build
```

## Content Model

The Studio includes document schemas for:

- Site
- Page
- Blog
- Author
- Taxonomy
- Header Navigation
- Footer Navigation
- Navigation Set
- Modal
- Singleton
- Redirect
- Translation Group

Reusable content includes page-builder blocks, cards, CTA/CTA Groups, links, SEO defaults, structured-data objects, navigation objects, and form field types.

## Pages

Pages are hierarchical and are organized in Studio by Site and Locale.

A Page can be a homepage or have a parent Page. Public paths are derived from the page hierarchy.

Equivalent translations should normally use the same logical slug/path. Locale prefixes are handled by the Web application rather than by changing the translated Page's logical path.

Example:

```text
English: /products/widget
Spanish: /us-es/products/widget
```

## Blogs

Blogs support:

- Title and summary
- Featured image
- Publish/update dates
- Author and optional reviewer
- Sources/citations
- Reusable page-builder content
- Taxonomy
- SEO
- Site/Locale routing

The same Blog slug may be used across different locales because the public locale prefix differentiates the route.

## Authors

Author records support localized author presentation and editorial information such as:

- Name
- Job title
- Biography
- Credentials/expertise
- Social links

Blog bylines and Author pages resolve the locale-appropriate Author information.

## Taxonomy

Taxonomy separates hierarchy from content assignment.

### Group / Folder

A Group / Folder exists to organize taxonomy hierarchy. It is not a content tag and should not be assignable to Blog articles.

### Taxonomy Term

A Taxonomy Term is an assignable concept.

Two independent usage settings control where a Term is available:

#### Available for Blog Tagging

Controls whether the Term appears in the Blog Taxonomy selector.

Disable this for internal/administrative Terms that should exist in the taxonomy but should not be assignable to Blog articles.

#### Include in Visitor Filters

Controls whether the Term can be exposed as a visitor-facing filter in a Document List.

This setting is independent from Blog tagging.

A Term can therefore be:

```text
Blog tagging:     Yes
Visitor filters:  No
```

or:

```text
Blog tagging:     No
Visitor filters:  Yes
```

Groups/Folders remain organizational only.

## Document List

The Document List block can use manually selected content or dynamically resolved content.

Dynamic configuration includes:

- Eligible content types
- Initial taxonomy restrictions
- Initial sort
- Search
- Visitor filtering
- Visitor sorting
- Pagination

### Require Search or Filter

The **Require Search or Filter** setting keeps the list in its initial state until the visitor supplies at least one meaningful input.

Either a text search or an active visitor filter is enough to load results. This includes taxonomy Filter Group selections.

The stored field remains `requireSearchQuery` for backward compatibility even though the Studio label reflects the broader behavior.

### Visitor taxonomy Filter Groups

Taxonomy visitor filters are organized as repeatable Filter Groups.

Example:

```text
Filter Group: Type
- Article
- Video

Filter Group: Treatment
- Asthma
- Diabetes
```

Each Filter Group contains:

- Group title
- Single or Multiple selection
- Any/All matching within the group
- Selected visitor-filterable Taxonomy Terms

Separate groups combine with AND behavior on the Web.

Explicit groups are used instead of automatically deriving the public filter UI from taxonomy parents. This keeps the public UI stable even if taxonomy hierarchy changes and allows editors to choose exactly which Terms belong together.

### Visitor sorting

Standard sort choices include:

- Relevance
- Newest
- Oldest
- Title A–Z
- Title Z–A

Custom sorts can be added for supported fields/directions when a standard sort does not cover the use case.

Custom authoring does not expose arbitrary GROQ.

## Grid Block

The Grid block exposes **Desktop Columns** rather than asking editors to configure every breakpoint.

The Web/Mino layer automatically renders:

```text
Mobile:  1 column
Tablet:  up to 2 columns
Desktop: configured Desktop Columns
```

This keeps authoring simple while preserving predictable responsive behavior.

## Shared Block Styles

Reusable Page Builder blocks expose a shared **Styles** group using the `blockStyles` object.

The initial shared controls are:

- **Vertical Padding** — Default, None, Small, Medium, Large, Extra Large, 2× Extra Large, 3× Extra Large
- **Background** — Default, Canvas, Surface, Brand Subtle
- **Content Width** — Default, Narrow, Standard, Wide, Full Width

`Default` means the block keeps its existing component styling.

These are semantic design-system choices rather than arbitrary CSS values. Editors are not given custom pixel spacing, hex colors, or CSS class fields.

## Navigation

Navigation is modeled with separate:

- Header Navigation
- Footer Navigation
- Navigation Set

Navigation documents are locale-aware.

Translated navigation creation remaps internal Page references to the matching target-locale Page when available. If a target Page does not exist, the translation workflow must not silently retain a source-locale internal Page reference.

## Modals and CTA Groups

Reusable Modal documents can be opened from CTAs.

CTA configuration is shared through the CTA Group object, including:

- Items
- Alignment
- Stack/direction behavior

Modal behavior such as focus management, Escape handling, overlay behavior, and scroll locking is implemented in Mino UI/Web rather than the Studio schema.

## Translations

The Studio provides a translation action for supported translatable document types.

Translation creation is Site- and Locale-aware.

Key translation behaviors include:

- Equivalent Pages resolve by hierarchy/path.
- Blogs can retain the same slug in multiple locales.
- Navigation Header/Footer internal Page links are remapped to target-locale Pages.
- Navigation Set translation creates/resolves the matching translated Header/Footer.
- Keyed content translations use stable keys. The translation-action implementation includes Modal support, but the current `studio/sanity.config.ts` action registration omits `modal`; verify the intended Modal authoring UI before relying on this action.
- Parent-first rules are enforced where the hierarchy requires a translated parent.

The Web language selector only exposes translations that actually exist. A missing translation is not represented as a fallback link to the target locale homepage.

## Revalidation

Publishing supported Sanity documents triggers the deployed Web application's revalidation webhook when the webhook is configured.

The canonical webhook filter and projection live in the Web package:

```text
web/src/cms/revalidation/webhook.ts
```

The projection intentionally includes both the document state before and after a change so route changes and delete operations can invalidate the correct URLs.

Configure the Sanity webhook with:

- The deployed Web `/api/revalidate` endpoint
- A secret matching the Web `SANITY_REVALIDATE_SECRET`
- **Include drafts** disabled
- **Include versions** disabled
- The filter/projection exported by the Web revalidation module

## Schema Change Checklist

When changing Studio schemas:

1. Update schema validation and reference filtering together.
2. Add/update focused Vitest coverage for regression-prone behavior.
3. Run:

```bash
pnpm test
pnpm build
```

4. Validate the authoring flow in Studio.
5. Validate the corresponding Web rendering/resolver behavior.
6. If the change affects the rendered UI, run the Web production-build Playwright smoke/visual workflow.

## Backward Compatibility

When evolving stored object shapes, prefer additive changes and resolver fallbacks when practical.

For example, Document List grouped taxonomy filters and newer sorting configuration should preserve support for previously stored content until an intentional content migration removes the legacy shape.
