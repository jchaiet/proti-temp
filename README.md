# Proti

Proti is a reusable website starter built with Next.js, Sanity, and Mino UI. It provides a production-oriented foundation for multi-site, multi-locale websites with structured content, navigation, search, translations, visual editing, revalidation, automated testing, and CI.

## Repository structure

```text
.
├── web/        Next.js website
├── studio/     Sanity Studio
├── scripts/    Proti initialization, seed, and validation tooling
├── docs/       Project and release documentation
└── .github/    CI workflows
```

## Requirements

Proti currently targets:

```text
Node 24.19.0
pnpm 10.34.1
```

Use the same pnpm version locally and in CI when updating dependencies or the lockfile.

## Start a new implementation

Install dependencies from the repository root:

```bash
pnpm install
```

Initialize the project:

```bash
pnpm proti:init
```

The initializer creates project-specific configuration, writes local environment files, and updates the root, Web, and Studio package names.

Add the required local Sanity values to `web/.env.local`:

```text
SANITY_API_READ_TOKEN=
SANITY_API_WRITE_TOKEN=
SANITY_REVALIDATE_SECRET=
```

The write token must be able to create documents in the configured Sanity project.

### Minimal seed

Create only the Site document:

```bash
pnpm proti:seed
```

### Optional starter content

To also create a minimal default-locale starting structure, run:

```bash
pnpm proti:seed --starter-content
```

This creates, only when missing:

```text
<default locale>
├── Home
├── Default Header
├── Default Footer
└── Default Navigation
```

Starter content is optional, idempotent, and non-destructive. Existing matching content is reused rather than overwritten.

Verify the setup:

```bash
pnpm proti:check
```

Then start Studio and Web:

```bash
pnpm dev:studio
pnpm dev:web
```

The default local URLs are:

```text
Studio  http://localhost:3333
Web     http://localhost:3000
```

See [`docs/PROJECT_INITIALIZATION.md`](docs/PROJECT_INITIALIZATION.md) for the full initialization workflow.

## Root commands

```bash
pnpm dev:web
pnpm dev:studio
pnpm build:web
pnpm build:studio

pnpm proti:init
pnpm proti:seed
pnpm proti:seed --starter-content
pnpm proti:check
pnpm test:proti
```

## Validation

### Proti setup tooling

From the repository root:

```bash
pnpm test:proti
```

### Studio

From `studio/`:

```bash
pnpm test
pnpm build
```

### Web

From `web/`:

```bash
pnpm test:run
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

### Playwright

For production-mode end-to-end checks, build and start the Web app first:

```bash
cd web
pnpm build
pnpm start
```

Then run:

```bash
pnpm test:e2e:smoke
pnpm test:e2e:visual
```

Only update visual baselines for an intentional visual change:

```bash
pnpm test:e2e:update
pnpm test:e2e:visual
```

Review and commit the changed screenshots after confirming the differences are expected.

## Locales

Proti uses lowercase language-region locale codes:

```text
en-us
es-us
fr-ca
```

The default locale is unprefixed in public URLs. Additional locales use a locale prefix.

Example:

```text
/products/widget
/es-us/products/widget
```

## Mino UI dependency

The Web app consumes Mino UI as a local tarball.

When Mino changes, do not replace a previously committed tarball with different bytes under the same version. Bump the Mino package version and tarball filename instead.

Example:

```text
mino-ui-0.0.2.tgz -> mino-ui-0.0.3.tgz
```

Update `web/package.json`, regenerate the root lockfile with the same pnpm version used by CI, and verify a frozen install before committing:

```bash
pnpm install --no-frozen-lockfile
pnpm install --frozen-lockfile
```

Commit the new tarball, `web/package.json`, `pnpm-lock.yaml`, and removal of the previous tarball together.

## CI

Pull requests and pushes to `main` validate:

- Proti initialization/seed/check tooling
- Studio tests and build
- Web tests, type checking, lint, and build
- Playwright smoke tests
- Playwright visual regression tests

Keep `pnpm install --frozen-lockfile` enabled in CI. Lockfile or tarball mismatches should be corrected in the repository rather than bypassed in CI.

## Release documentation

Before tagging a release, use:

- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)
- [`CHANGELOG.md`](CHANGELOG.md)

## Documentation index

- [Getting Started](docs/GETTING_STARTED.md) · [Architecture](docs/ARCHITECTURE.md) · [Configuration](docs/CONFIGURATION.md)
- [Content Model](docs/CONTENT_MODEL.md) · [Components](docs/COMPONENTS.md) · [Editor Guide](docs/EDITOR_GUIDE.md) · [Translations](docs/TRANSLATIONS.md)
- [SEO/GEO](docs/SEO_GEO.md) · [Testing](docs/TESTING.md) · [Deployment](docs/DEPLOYMENT.md)
- [v0.3.0 Release Notes](docs/releases/v0.3.0.md) · [Release Checklist](docs/RELEASE_CHECKLIST.md) · [Changelog](CHANGELOG.md)

## Current baseline

The current release target is **Proti v0.3.0**. The implementation passed final developer and integration checks; complete the repository artifact/CI audit before tagging. The `mino-ui-0.0.3.tgz` package dependency is independently versioned and must be present in the release repository.
