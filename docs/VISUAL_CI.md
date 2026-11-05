# Visual Regression CI

Proti uses Playwright visual regression testing as a required CI quality gate.

## Purpose

Visual regression tests detect unintended UI changes by comparing current Chromium screenshots against approved baseline screenshots committed to the repository.

Visual CI runs after the functional Playwright smoke tests have passed.

## Required Visual Projects

Visual regression runs only against:

```text
chromium-desktop
chromium-mobile
```

Firefox remains part of cross-browser functional smoke coverage but does not maintain a separate visual baseline.

## CI Behavior

The visual job is now blocking.

A visual regression failure causes CI to fail and prevents a protected pull request from being merged.

The job should no longer include:

```yaml
continue-on-error: true
```

## Required Branch Check

`Playwright visual` is a required status check for the protected `main` branch.

Current required checks:

```text
Studio
Web
Playwright smoke
Playwright visual
```

## Visual Test Command

CI runs the visual suite against a production build:

```bash
pnpm test:e2e:visual \
  --project=chromium-desktop \
  --project=chromium-mobile
```

## Approved Baselines

The committed screenshots are the approved visual baselines.

Canonical local validation:

```bash
cd web
pnpm build
pnpm start
pnpm test:e2e:visual
```

## Intentional Visual Changes

Do not update screenshots merely because CI fails.

First run:

```bash
pnpm test:e2e:visual
```

Inspect the expected, actual, and diff images.

If the change is intentional:

```bash
pnpm test:e2e:update
pnpm test:e2e:visual
```

Review the new screenshots and commit the approved baselines with the code change.

## CI Artifacts

When visual tests fail, inspect the uploaded Playwright artifacts:

```text
web/playwright-report/
web/test-results/
```

These may contain expected, actual, and diff screenshots plus failure context.

## Relationship to Smoke Tests

```text
Playwright smoke
→ Does the application function correctly in real browsers?

Playwright visual
→ Does the approved UI still look the same?
```

Both are required before merging into `main`.

## Current Status

The GitHub-hosted visual environment has been validated successfully. Visual regression is now part of Proti's required PR checks.
