# Proti Playwright E2E tests

For the v0.3 production-release workflow, see [Testing](../../docs/TESTING.md). For intentional screenshot changes, failure investigation, and Sanity content considerations, see [Visual regression testing](./VISUAL_REGRESSION.md).

Run the commands below from the **`web/` app root**, alongside its `package.json`, not from the Sanity Studio package.

## 1. Install Playwright browsers

Playwright is already a Web development dependency in Proti v0.3. Install browser binaries if necessary:

```bash
pnpm exec playwright install chromium firefox
```

Do not re-add the dependency just to run existing tests.

On Linux CI, if the runner does not already have the required system dependencies:

```bash
pnpm exec playwright install --with-deps chromium firefox
```

## 2. Add the package.json scripts

Merge these into the web app's existing `scripts` object:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:smoke": "playwright test e2e/smoke.spec.ts",
  "test:e2e:visual": "playwright test e2e/visual.spec.ts",
  "test:e2e:update": "playwright test e2e/visual.spec.ts --update-snapshots",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:report": "playwright show-report"
}
```

## 3. Create your local E2E environment file

Copy:

```text
e2e/.env.e2e.example
```

to:

```text
e2e/.env.e2e
```

Then uncomment/configure only routes that really exist in the Sanity content
for the site you are testing.

The homepage (`/`) is always tested. All other route types are optional.

## 4. Run smoke tests first

```bash
pnpm test:e2e:smoke
```

The smoke suite runs in three projects:

- `chromium-desktop`: Desktop Chrome profile at 1440 × 900
- `chromium-mobile`: Playwright's Pixel 7 device profile
- `firefox-desktop`: Desktop Firefox profile at 1440 × 900

The Chromium mobile project uses Playwright's full device descriptor rather
than only shrinking the viewport. That also emulates relevant mobile browser
properties such as touch, screen size and user agent.

## 5. Visual regression testing

Playwright checks Chromium desktop and mobile screenshots against the approved
images in `e2e/__screenshots__/`. Firefox is covered by functional smoke tests,
not screenshot baselines.

Run the visual checks without modifying approved screenshots:

```bash
pnpm test:e2e:visual
```

**Only after reviewing and approving an intentional visual change**, refresh
the relevant snapshots and commit the PNGs. Do not automatically update them
in normal CI runs.

The complete production-server workflow (including the Sanity Navigation
**Floating → Glass** example, snapshot commands, CI troubleshooting, and
future regression-dataset strategy) is in **[VISUAL_REGRESSION.md](./VISUAL_REGRESSION.md)**.

## Useful commands

Run everything:

```bash
pnpm test:e2e
```

Open Playwright's interactive UI:

```bash
pnpm test:e2e:ui
```

Open the latest HTML report:

```bash
pnpm test:e2e:report
```

Run a single project when debugging:

```bash
pnpm exec playwright test --project=chromium-desktop
pnpm exec playwright test --project=chromium-mobile
pnpm exec playwright test --project=firefox-desktop
```

## Notes about screenshot baselines

Browser screenshots can differ across operating systems, fonts, hardware and
headless/headed environments. Generate and compare baselines in the same
environment whenever possible. See [VISUAL_REGRESSION.md](./VISUAL_REGRESSION.md)
for detailed troubleshooting and snapshot-approval steps.
