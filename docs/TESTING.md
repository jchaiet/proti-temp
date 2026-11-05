# Test and regression workflow

Tests run in three package contexts: **Proti root**, **Studio**, and **Web**. Don't run Web E2E scripts from the repository root; they are declared in `web/package.json`.

## Automated commands

| Location  | Commands                                                                                                      | Purpose                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Root      | `pnpm test:proti`, `pnpm proti:check`                                                                         | Initializer/seed/check tests and environment + Site validation |
| `studio/` | `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`                                                           | Studio tests, TypeScript, Sanity build                         |
| `web/`    | `pnpm test:run`, `pnpm lint`, `pnpm typecheck`, `pnpm build`                                                  | Vitest, lint, Next typegen + TS, production build              |
| `web/`    | `pnpm test:routing`, `pnpm test:search`, `pnpm test:document-list`, `pnpm test:seo`, `pnpm test:revalidation` | Focused regressions                                            |
| `web/`    | `pnpm test:e2e:smoke`, `pnpm test:e2e:visual`, `pnpm test:e2e`                                                | Playwright functional / visual / all                           |

Studio has a test script but its uploaded `package.json` has **no lint script**. If the repository has a separate Studio ESLint configuration, use the configured command; don't document `pnpm lint` in Studio as guaranteed.

## Playwright browser projects

Defined in `web/playwright.config.ts`:

- `chromium-desktop` (1440 × 900)
- `chromium-mobile` (Pixel 7 device emulation)
- `firefox-desktop` (1440 × 900, **smoke/functionality only**)

Visual screenshots are committed in `web/e2e/__screenshots__/chromium-desktop/` and `chromium-mobile/`. Firefox is excluded from `visual.spec.ts` to reduce browser-rendering noise.

The sample route list is configured by `web/e2e/.env.e2e` (copy `web/e2e/.env.e2e.example` and enable only existing published pages). The base URL is read from `PLAYWRIGHT_BASE_URL`, which must use the hostname your Site recognizes.

## Recommended production-mode Playwright verification

Terminal 1, from `web/`:

```bash
pnpm build
pnpm start
```

Terminal 2, also from `web/`, with `PLAYWRIGHT_BASE_URL=http://localhost:3000` and `PLAYWRIGHT_SKIP_WEBSERVER=1` in `e2e/.env.e2e`:

```bash
pnpm test:e2e:smoke
pnpm test:e2e:visual
pnpm test:e2e
```

`pnpm test:e2e` includes smoke and visual specs; the separate invocations are optional when you want clearer diagnostics. Without `PLAYWRIGHT_SKIP_WEBSERVER=1`, Playwright may launch/reuse a development server according to configuration—**confirm which server is actually being tested**.

## Screenshot approval policy

Do **not** run `pnpm test:e2e:update` as a routine prerequisite. If a visual assertion fails:

1. Examine expected, actual, diff, and error context in the HTML report (`pnpm test:e2e:report`).
2. Determine whether the difference is a real regression, dynamic-data noise, environment drift, or an intentional design change.
3. Fix unintended changes. Only for approved visual changes run `pnpm test:e2e:update` in the target baseline environment.
4. Review `git diff -- web/e2e/__screenshots__/` and commit approved baselines.
5. Run `pnpm test:e2e` **without** updating baselines to prove the result is stable.

Proti's v0.3 checks encountered a stale Next.js development-indicator screenshot; disabling the indicator in `web/next.config.ts` and approving the clean baselines resolved that discrepancy. This is historical context, not a reason to overwrite future failing snapshots.

## Manual integration checks

Verify a Page, Blog, Author, translation, SEO metadata/JSON-LD, Search and Document Lists, CTA/Modal keyboard behavior, and a **deployed** publish→webhook→frontend refresh. `pnpm start` serves a cached production build and is not guaranteed to receive an external webhook from Sanity when run only on localhost.

See [Visual CI](VISUAL_CI.md), [SEO/GEO](SEO_GEO.md), and [Release Checklist](RELEASE_CHECKLIST.md).
