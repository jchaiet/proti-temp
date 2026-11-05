# Configuration and environment

Proti has three distinct configuration layers. Do not treat their files or environment-variable namespaces as interchangeable.

## 1. Project initializer configuration

`proti.config.json` is the generated setup record; the starter also includes `proti.config.example.json`. The initializer (`scripts/proti-init.mjs`) collects project/package identity, Sanity project/dataset, Studio/preview URLs, and Site identity/hosts/locales. `pnpm proti:check` validates agreement among configuration, environment files, packages, and the Site document. See [Project Initialization](PROJECT_INITIALIZATION.md).

For Site routing:

- `domains` are hostnames, not full `https://` URLs.
- `canonicalDomain` is the preferred hostname for search and entity URLs; it must be a configured Site domain.
- `defaultLocale` is omitted from public URLs; other locale codes are prefixed.
- Current locale conventions use `en-us`, `es-us`, `fr-ca`, etc. Some older source comments/examples use legacy aliases; use actual Site locale values for your implementation.

## 2. Web environment (`web/.env.local`)

| Variable                   | Use                                                                  | Exposure                |
| -------------------------- | -------------------------------------------------------------------- | ----------------------- |
| `NEXT_SANITY_PROJECT_ID`   | Sanity client project                                                | Nonsecret               |
| `NEXT_SANITY_DATASET`      | Sanity dataset                                                       | Nonsecret               |
| `NEXT_SANITY_STUDIO_URL`   | Visual editing/Studio origin                                         | Nonsecret               |
| `SANITY_API_READ_TOKEN`    | Draft Mode reads and server-side operations requiring private access | **Secret; server only** |
| `SANITY_API_WRITE_TOKEN`   | Sanity write operations such as seed/Poll voting                     | **Secret; server only** |
| `SANITY_REVALIDATE_SECRET` | Validate signed publish webhook calls                                | **Secret; server only** |

Source references: `web/src/sanity/env.ts`, `web/src/sanity/fetch.ts`, `web/src/app/api/revalidate/route.ts`, `web/src/app/api/poll/vote/route.ts`. Some deployment environments may require further variables; review the application runtime before promoting an environment.

Do not place API tokens in `NEXT_PUBLIC_*` variables, commit `.env.local`, or copy live secrets into example files.

## 3. Studio environment (`studio/.env.local`)

| Variable                    | Use                                                                    |
| --------------------------- | ---------------------------------------------------------------------- |
| `SANITY_STUDIO_PROJECT_ID`  | Required Studio Sanity project ID                                      |
| `SANITY_STUDIO_DATASET`     | Dataset (default in source: `production`)                              |
| `SANITY_STUDIO_TITLE`       | Optional Studio display name                                           |
| `SANITY_STUDIO_PREVIEW_URL` | Next.js origin used by Presentation (default: `http://localhost:3000`) |

These are consumed by `studio/sanity.config.ts`. The initializer generates a Studio environment file; contrary to one older Studio README paragraph, the code **does** read Studio environment variables. Keep Studio and Web pointed at the same dataset.

## 4. Playwright (`web/e2e/.env.e2e`)

The actual contract is in `web/playwright.config.ts` and `web/e2e/helpers/environment.ts`:

| Variable                        | Purpose                                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| `PLAYWRIGHT_BASE_URL`           | Site URL to exercise (config default: `http://127.0.0.1:3000`)         |
| `PLAYWRIGHT_WEB_SERVER_COMMAND` | Server launch command when Playwright starts one (default: `pnpm dev`) |
| `PLAYWRIGHT_SKIP_WEBSERVER=1`   | Use a manually started server instead of launching one                 |

The route-specific variables and examples live in `web/e2e/.env.e2e.example`. Use `http://localhost:3000` when the Site resolves `localhost`; `127.0.0.1` is not equivalent for host-matched content. In CI, review configuration and required route fixtures.

## Secrets and publication hygiene

- Keep local env files untracked; commit only placeholder templates.
- Treat environment contents uploaded to third parties as exposed; rotate credentials when appropriate.
- Sanity webhook secret must match the deployed Web project; the webhook signs calls to `/api/revalidate`.
- GitHub Actions secrets and Vercel environment values are managed separately.
- Verify `.gitignore` and the committed file set; the source archive used to author these docs did not include a root lockfile or CI workflow files, so their tracked status was **not verified**.

See [Deployment](DEPLOYMENT.md) and [Release Checklist](RELEASE_CHECKLIST.md).
