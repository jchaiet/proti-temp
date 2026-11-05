# Proti — Playwright Visual Regression Testing

A reference for updating Proti's approved Playwright screenshots after **intentional visual changes** to Mino UI or content in Sanity Studio.

> **Location:** `web/e2e/VISUAL_REGRESSION.md`. Run commands from the `web/` directory unless otherwise stated. For Playwright installation, E2E route setup, and smoke tests, see [E2E README](./README.md).

## Why a visual test can fail without a code change

Playwright compares each newly rendered page with an **approved screenshot committed to Git**. A published Sanity setting can change the rendered page even when the Next.js and Mino UI source code have not changed.

**Example from Proti:** The homepage baseline had been captured with the **Floating** Navigation variant. Changing the published Sanity Navigation variant to **Glass** made GitHub Actions render a different header. Floating measured approximately **78px** tall on desktop; Glass approximately **61px**. The resulting **17px shift** moved other page content, and desktop/mobile screenshot tests failed. Restoring the published Floating variant made the baselines match again.

**Publishing content is not the same as deploying code:** Publishing a Sanity document makes its published values available to applications querying that dataset. A Sanity Studio or Next.js code deployment usually isn't needed for a simple content setting change. Caches/revalidation may affect when an already-running site displays that change. An **unpublished draft** ordinarily doesn't appear in production-mode queries.

## When to update snapshots

Update approved screenshots when the new appearance is **intentional**, such as changing Navigation from Floating to Glass, changing a component's spacing, or approving new hero content. **Do not update screenshots simply to make an unexplained failure green.** Investigate it first.

## Approving an intentional change (Floating → Glass example)

### 1. Publish the desired content in Sanity

1. Open the relevant Site/Navigation document in Sanity Studio.
2. Select the desired variant (for example, **Glass**).
3. **Publish** the document, not just save a draft.
4. Verify that the local app and GitHub Actions will use the **same Sanity project and dataset**. Currently GitHub Actions uses `NEXT_SANITY_DATASET=production`.

> If you later configure a dedicated `regression` dataset, make and approve the change **there** for screenshot testing, not in live `production` content.

### 2. Build and run Proti in production mode

Stop any existing `pnpm dev` or `pnpm start` processes listening on port 3000. From `web/`:

```bash
rm -rf .next
pnpm build
pnpm start
```

Keep the terminal open. Confirm `http://localhost:3000/` renders the expected appearance and **does not show the Next.js development indicator**.

> **Important:** Proti resolves Sanity Sites by hostname. Use `localhost:3000` unless the Site's domains are configured for another hostname. An arbitrary IP or different hostname may return HTTP 404 even if the server is running.

### 3. Regenerate the approved screenshots

In a **second** terminal, from `web/`:

**Homepage only (desktop and mobile):**

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_SKIP_WEBSERVER=1 \
pnpm exec playwright test e2e/visual.spec.ts \
  --grep 'home visual baseline' \
  --project=chromium-desktop \
  --project=chromium-mobile \
  --update-snapshots=all \
  --workers=1
```

**All configured visual routes:**

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_SKIP_WEBSERVER=1 \
pnpm exec playwright test e2e/visual.spec.ts \
  --project=chromium-desktop \
  --project=chromium-mobile \
  --update-snapshots=all \
  --workers=1
```

Playwright writes approved files under `web/e2e/__screenshots__/chromium-desktop/` and `chromium-mobile/`, using the route's screenshot name (for example, `home.png` and `blog.png`). **Only routes configured for the current E2E environment are tested.** The GitHub Actions visual job currently sets `E2E_HOME_PATH=/`; other routes need their corresponding `E2E_*_PATH` values if they should be included in CI.

`PLAYWRIGHT_SKIP_WEBSERVER=1` makes Playwright use the already-running production server. Do **not** point it at `pnpm dev` when creating approved baselines. The test also checks that the `nextjs-portal` development overlay is absent.

### 4. Review the images and verify without updating

From `web/`:

```bash
git status --short e2e/__screenshots__/
git diff --stat -- e2e/__screenshots__/
```

Open the changed images. Confirm the intended Navigation/layout and check for missing assets, incorrect content, or overlays. Then rerun **without** `--update-snapshots`:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_SKIP_WEBSERVER=1 \
pnpm exec playwright test e2e/visual.spec.ts \
  --project=chromium-desktop \
  --project=chromium-mobile \
  --workers=1
```

Every relevant visual test should pass against the newly approved screenshots.

### 5. Commit approved screenshots

From `web/`:

```bash
git add e2e/__screenshots__/
git commit -m "test: approve visual baselines for glass navigation"
git push
```

GitHub Actions now compares against the new approved appearance. **Never enable automatic snapshot updates in normal CI test runs**, because that would silently accept regressions.

## Troubleshooting

| Symptom                                         | Check first                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| All pages return HTTP **404**                   | Check the server URL, Proti Site domains/hostname matching, Sanity project and dataset, and whether the required content is published.     |
| New screenshots still show the **Next.js icon** | Stop `pnpm dev`; verify `pnpm start` is serving a fresh production build and Playwright is targeting that port.                            |
| Screenshot files don't change                   | Check whether tests failed **before** `toHaveScreenshot()`, whether routes were selected, and the actual snapshot path.                    |
| Local screenshots pass, CI fails                | Compare **published Sanity configuration**, build/cache state, installed Mino package, Playwright version, fonts and browser/OS rendering. |
| CI reports only two tests                       | The CI job currently configures the **homepage** route; extra route variables must be configured to cover additional pages.                |
| Visual differences are unexpected               | Download Playwright's `*-actual.png` and `*-diff.png` artifacts from GitHub Actions; do not blindly approve them.                          |

Playwright warns that screenshot output can differ across operating systems, browsers, fonts and other system settings. For reproducible baselines, generate and compare screenshots in a **matching environment**; a pinned Playwright container is a good future improvement.

## Future: keeping visual regression independent of production content

A dedicated **`regression`** Sanity dataset would prevent routine editing in the production dataset from changing CI screenshots.

Suggested roles **if** Proti eventually requires five isolated environments:

| Dataset       | Purpose                                                         | Typical maintenance                                                                                                  |
| ------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `development` | Experiment with schemas, components and content freely          | Refresh from a safe content export when needed; changes are disposable.                                              |
| `qa`          | Functional integration and editor acceptance tests              | Reset to a known test state for QA cycles; can be temporary if QA isn't separately staffed.                          |
| `staging`     | Final release rehearsal with production-like data               | Refresh from production deliberately before releases; verify webhooks, routing and previews.                         |
| `production`  | Real published content for the live site                        | Author and publish normally; protect from test writes and automatic resets.                                          |
| `regression`  | Stable fixtures for Playwright screenshots and automated checks | **Do not auto-sync** from production. Change fixtures and screenshot baselines deliberately in the same reviewed PR. |

**Five datasets are optional, not a prerequisite.** The immediate improvement is isolating `regression` from mutable production content. Start with the fewest datasets your Sanity plan and development process support; add QA/Staging only when they provide real value. Check your Sanity plan's current dataset limits and pricing before adopting a five-dataset design.

A separate dataset **isolates content**, but a complete environment also needs matching application configuration, Studio workspace/configuration, dataset-scoped webhook routing, credentials/permissions, and sometimes a separate preview/deployment URL. Schema code lives in Git and is promoted through code deployments; content is managed separately. Copying or importing content into a dataset is **not** an automatic, bidirectional sync.

For regression fixtures, include enough connected documents for the full page to resolve: Site and hostname/domain mapping, locale settings, Navigation Set/Header/Footer, pages, blogs/authors, assets and translations used in screenshots. Prefer a small, reviewable seeded fixture over an automatic production clone.

### Operational rules

- **Development:** change as often as needed; refresh/reset when useful.
- **QA/Staging:** deliberately seed or refresh at milestones; never assume that publishing in one dataset publishes to another.
- **Production:** editors own the published data; never overwrite it during test resets.
- **Regression:** treat content fixtures and screenshot PNGs as a **versioned test contract**. Update both only when an intentional UI/content change is approved.
- **CI:** set `NEXT_SANITY_DATASET=regression` only **after** that dataset exists, has its complete fixtures, and the site hostname resolves in the test server. Until then, CI remains on the configured production dataset.

## References

- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
- [Sanity environments: development, staging, production](https://www.sanity.io/docs/content-lake/environments)
- [Sanity datasets](https://www.sanity.io/docs/content-lake/datasets)
- [Sanity CLI dataset commands](https://www.sanity.io/docs/cli-reference/cli-datasets)
- [Sanity pricing and dataset allowances](https://www.sanity.io/pricing)
