# Proti Project Initialization

Proti includes a repository-level setup workflow for creating a new implementation from the starter without editing source files just to connect a new Sanity project.

## Commands

```bash
pnpm proti:init
pnpm proti:seed
pnpm proti:seed --starter-content
pnpm proti:check
```

## 1. Install dependencies

From the repository root:

```bash
pnpm install
```

Use the pnpm version configured by the repository/CI when generating or updating `pnpm-lock.yaml`.

## 2. Initialize

Run:

```bash
pnpm proti:init
```

The initializer prompts for:

- project name
- package/project slug
- Sanity project ID
- Sanity dataset
- Studio URL used by the Web app
- Web URL used by Sanity Presentation
- initial Site name
- initial Site key
- Site domains
- canonical domain
- default locale
- supported locales

Site domains are hostname-only (for example `example.com` or `localhost`). The canonical domain must be one of those configured Site domains and is the hostname Proti uses for canonical URLs, hreflang, sitemap URLs, robots.txt, and structured data.

Proti locale codes use lowercase language-region format:

```text
en-us
es-us
fr-ca
fil-ph
```

The initializer writes:

```text
proti.config.json
web/.env.local
studio/.env.local
```

It also updates the package names in the root, Web, and Studio `package.json` files.

Rerunning `proti:init` reuses the existing project values as defaults and preserves the known Sanity token/secret values already present in `web/.env.local`.

## 3. Add local secrets

The initializer does not ask for secrets interactively. Add the required values to `web/.env.local`:

```text
SANITY_API_READ_TOKEN=
SANITY_API_WRITE_TOKEN=
SANITY_REVALIDATE_SECRET=
```

`SANITY_API_READ_TOKEN` is used by Draft Mode / Visual Editing.

`SANITY_API_WRITE_TOKEN` is required by `proti:seed` and must have permission to create documents in the configured Sanity project.

## 4. Seed Sanity

There are two supported flows.

### Minimal setup

Run:

```bash
pnpm proti:seed
```

This creates only the configured Site document.

If the Site already exists, content is not overwritten. If the Site predates the canonical-domain field and that field is missing, `proti:seed` safely backfills it from `proti.config.json`. An already-authored canonical domain is never replaced.

### Optional starter content

Run:

```bash
pnpm proti:seed --starter-content
```

This ensures the Site exists and then creates a minimal usable structure for the Site default locale:

```text
<default locale>
├── Home
├── Default Header
├── Default Footer
└── Default Navigation
```

Starter content is deliberately minimal. It does not create demo articles, authors, taxonomy, marketing copy, or translated duplicates.

The operation is non-destructive:

- existing documents are not replaced
- an existing homepage for the Site + default locale is reused
- matching `default-header`, `default-footer`, and `default` navigation documents are reused
- newly seeded documents use deterministic IDs
- `createIfNotExists` is used for new documents
- rerunning the command is safe
- only the Site default locale receives starter content

Starter content can also be added later:

```bash
pnpm proti:seed
# ...later...
pnpm proti:seed --starter-content
```

## 5. Verify setup

Run:

```bash
pnpm proti:check
```

The check is read-only. It verifies:

- `proti.config.json`
- Web environment alignment
- Studio environment alignment
- root/Web/Studio package names
- required token/secret presence
- Sanity connectivity
- configured Site identity, canonical domain, and locale configuration

Because starter content is optional, missing starter documents do not make `proti:check` fail.

## 6. Start Studio and Web

Run in separate terminals:

```bash
pnpm dev:studio
```

```bash
pnpm dev:web
```

Default local URLs:

```text
Studio  http://localhost:3333
Web     http://localhost:3000
```

Use `localhost` for the local Site domain unless the Site is intentionally configured differently.

## Generated configuration

A typical `proti.config.json` looks like:

```json
{
  "version": 1,
  "projectName": "Acme Health",
  "packageName": "acme-health",
  "sanity": {
    "projectId": "abc123",
    "dataset": "production",
    "studioUrl": "http://localhost:3333",
    "previewUrl": "http://localhost:3000"
  },
  "site": {
    "name": "Acme Health",
    "key": "acme-health",
    "domains": ["localhost"],
    "canonicalDomain": "localhost",
    "defaultLocale": "en-us",
    "locales": [
      { "code": "en-us", "label": "English (US)" },
      { "code": "es-us", "label": "Spanish (US)" }
    ]
  }
}
```

## Studio environment

`studio/sanity.config.ts` uses:

```text
SANITY_STUDIO_PROJECT_ID
SANITY_STUDIO_DATASET
SANITY_STUDIO_TITLE
SANITY_STUDIO_PREVIEW_URL
```

## CI

The Proti setup regression suite runs with:

```bash
pnpm test:proti
```

CI should keep frozen lockfile installation enabled:

```bash
pnpm install --frozen-lockfile
```

## Vercel

The initializer configures local files only. Vercel environment variables are separate and must be configured on the Vercel project.

## Not automated

The initializer does not:

- create a Sanity project
- create Sanity API tokens
- configure GitHub secrets/variables
- configure Vercel environment variables
- deploy Studio or Web
- create translated content
- create opinionated demo content
