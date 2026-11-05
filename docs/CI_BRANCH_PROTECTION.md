# CI and Branch Protection

This guide describes the intended GitHub CI and branch-protection setup for Proti. Confirm the rules and workflow against the live repository: `.github/` was not included in the v0.3 source archive supplied for documentation.

## Purpose

The CI workflow is Proti's automated pre-merge quality gate.

When a pull request targets `main`, GitHub runs the required validation suite. The PR cannot be merged until all required checks pass.

After the PR is merged, CI runs again against the resulting `main` branch.

## CI Triggers

```yaml
on:
  pull_request:
  push:
    branches:
      - main
```

This provides:

```text
Pull request
→ Pre-merge validation

Push / merge to main
→ Post-merge verification
```

## Required CI Jobs

### Studio

```text
Install dependencies
Run Studio tests
Build Studio
```

### Web

```text
Install dependencies
Run Vitest
Generate Next.js route types
Run TypeScript
Run ESLint
Build production Web app
```

Type checking must generate Next.js types first:

```bash
pnpm exec next typegen && pnpm exec tsc --noEmit
```

### Playwright Smoke

Runs functional browser tests against a production build using Chromium and Firefox.

### Playwright Visual

Runs required visual regression tests against the approved Chromium baselines:

```text
chromium-desktop
chromium-mobile
```

Visual regression is now blocking.

## Required Status Checks

The protected `main` branch requires:

```text
Studio
Web
Playwright smoke
Playwright visual
```

If any required check fails, GitHub prevents the PR from being merged.

## Branch Ruleset

Configure the `main` ruleset under:

```text
Repository
→ Settings
→ Rules
→ Rulesets
```

Recommended rules:

```text
Require a pull request before merging              ON
Require status checks to pass before merging       ON
Require conversation resolution before merging     ON
Require branch to be up to date before merging     Optional
Require signed commits                             OFF
Require merge queue                                OFF
```

Force pushes and deletion of `main` should remain disabled.

## Pull Request Flow

```text
Feature branch
      ↓
Open PR to main
      ↓
Studio
Web
Playwright smoke
Playwright visual
      ↓
All required checks pass
      ↓
Review conversations resolved
      ↓
Merge
      ↓
CI runs again on main
      ↓
Vercel production deployment
```

## Vercel Deployment

The Web application is hosted on Vercel.

GitHub Actions and Vercel use separate environment-variable systems. A value configured as a GitHub secret is not automatically available to Vercel.

The Vercel production project must contain the environment variables required by the Web application, including:

```text
NEXT_SANITY_PROJECT_ID
NEXT_SANITY_DATASET
NEXT_SANITY_STUDIO_URL
SANITY_API_READ_TOKEN
SANITY_API_WRITE_TOKEN
SANITY_REVALIDATE_SECRET
```

The current Proti production deployment has been validated successfully on Vercel.

## Runtime Versions

```text
Node: 24.19.0
pnpm: 10.34.1
```

Keep local development aligned with CI. A root `.nvmrc` containing `24.19.0` is recommended.

## pnpm Workspace Cache

CI uses the root workspace lockfile:

```yaml
cache: pnpm
cache-dependency-path: pnpm-lock.yaml
```

A first-run message such as `pnpm cache is not found` is normal.

## Local Mino Tarball

Web currently consumes:

```text
web/mino-ui-0.0.3.tgz
```

After intentionally rebuilding/replacing it:

```bash
pnpm install --update-checksums
pnpm install --frozen-lockfile
```

Commit the updated tarball and `pnpm-lock.yaml` together.

## Result

```text
Code change
→ PR
→ Automated quality gates
→ Merge
→ main verification
→ Production deployment
```
