# Proti Release / Repo Hygiene Checklist

Use this before merging a release PR and before tagging a Proti baseline.

## Version / release target

- [ ] Root/Web/Studio package versions match the intended Proti `0.3.0` release.
- [ ] Independently-versioned local Mino UI tarball is present in `web/` and matches `web/package.json` and the root lockfile.
- [ ] Review [v0.3.0 Release Notes](releases/v0.3.0.md) and [SEO/GEO](SEO_GEO.md).

- [ ] Release target is documented in `CHANGELOG.md`.
- [ ] Release PR contains only intended changes.
- [ ] `git status` is clean after the final validation run.

## Repository hygiene

- [ ] `web/.env.local` is ignored.
- [ ] `web/e2e/.env.e2e` is ignored.
- [ ] `web/.env.example` is committed.
- [ ] `web/e2e/.env.e2e.example` is committed.
- [ ] `test-results/` is ignored.
- [ ] `playwright-report/` is ignored.
- [ ] Playwright baselines under `web/e2e/__screenshots__/` are committed.
- [ ] No temporary ZIPs, debug output, generated reports, or local-only files are tracked.
- [ ] README instructions match actual package scripts.
- [ ] `pnpm-lock.yaml` is current.

Recommended environment ignore pattern:

```gitignore
.env*
!.env.example
!e2e/.env.e2e.example
```

## Proti DX validation

From the repository root:

```bash
pnpm test:proti
```

Perform a clean-clone/new-implementation rehearsal when initialization behavior changes:

```bash
pnpm install
pnpm proti:init
# add local Sanity token/secret values
pnpm proti:seed --starter-content
pnpm proti:check
pnpm dev:studio
pnpm dev:web
```

Verify:

- [ ] Site is created.
- [ ] Optional starter-content flow creates Home, Default Header, Default Footer, and Default Navigation.
- [ ] Rerunning the seed command does not duplicate or overwrite existing content.
- [ ] `proti:check` reports the implementation ready.

## Mino UI tarball updates

When Mino changes:

- [ ] Bump the Mino package version.
- [ ] Create a new versioned tarball filename (for example `mino-ui-0.0.3.tgz`).
- [ ] Do not replace a committed tarball with different bytes under the same version.
- [ ] Update `web/package.json` to the new tarball.
- [ ] Use the same pnpm version locally that CI uses.
- [ ] Regenerate the lockfile after the manifest change.
- [ ] Confirm the frozen install passes locally.

Recommended flow:

```bash
pnpm install --no-frozen-lockfile
pnpm install --frozen-lockfile
```

Commit together:

```text
web/package.json
web/mino-ui-<new-version>.tgz
pnpm-lock.yaml
removal of the previous tarball (when applicable)
```

## Studio validation

From `studio/`:

```bash
pnpm test
pnpm build
```

Run lint as configured by the Studio package/repository.

## Web validation

From `web/`:

```bash
pnpm test:run
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

## Production Playwright validation

From `web/`, build and start the production application:

```bash
pnpm build
pnpm start
```

With `e2e/.env.e2e` configured for `http://localhost:3000` and `PLAYWRIGHT_SKIP_WEBSERVER=1`, run:

```bash
pnpm test:e2e:smoke
pnpm test:e2e:visual
```

Only run this when intentionally approving a visual change:

```bash
pnpm test:e2e:update
```

After updating a baseline:

- [ ] Inspect the changed screenshot/diff.
- [ ] Confirm the visual change is intentional.
- [ ] Rerun `pnpm test:e2e:visual`.
- [ ] Commit the updated baseline screenshot.

## Functional sanity checks

Verify representative content after deployment:

- [ ] Page publish/update
- [ ] Blog publish/update
- [ ] Author publish/update
- [ ] Taxonomy changes
- [ ] Navigation changes
- [ ] Modal behavior
- [ ] Translations/language selector
- [ ] Document List search/filter/sorting
- [ ] Sanity webhook revalidation without redeploy

## CI

Required checks should pass on the release PR:

- [ ] Studio
- [ ] Web
- [ ] Playwright smoke
- [ ] Playwright visual

Do not loosen `--frozen-lockfile` to make a release pass. Fix dependency, tarball, or lockfile drift in the repository instead.

## Documentation

- [ ] Root `README.md` matches the current repository workflow.
- [ ] `docs/PROJECT_INITIALIZATION.md` matches `proti:init`, `proti:seed`, and `proti:check` behavior.
- [ ] `docs/RELEASE_CHECKLIST.md` reflects current validation commands.
- [ ] `CHANGELOG.md` includes the release.
- [ ] Environment variable examples contain placeholders only—never real secrets.

## v0.3 SEO/GEO sign-off

- [ ] Representative Page, Blog, and Author HTML: canonical, hreflang, `lang`, metadata, robots and JSON-LD confirmed.
- [ ] Locale selector only offers existing equivalents and has no broken fallback items.
- [ ] Sitemap/robots reflect production Site canonical domain and indexed routes.
- [ ] Publish/revert webhook revalidation verified in the deployed environment.
- [ ] Secrets (including E2E environment credentials) rotated if disclosed and all local env files ignored.
- [ ] `.github` workflows and CI status requirements inspected in the actual repository; not present in the supplied documentation archive.
- [ ] Confirm optional Web/Studio `.env.example` templates are tracked; these were not present in the supplied documentation archive.
- [ ] Baselines were inspected/committed and final `pnpm test:e2e` passed without regenerating them.

## Tagging

After the release PR is merged and `main` is green:

```bash
git checkout main
git pull --ff-only
git tag -a v0.3.0 -m "Proti v0.3.0"
git push origin v0.3.0
```

Adjust the tag version for later releases.
