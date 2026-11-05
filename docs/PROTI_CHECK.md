# Proti Setup Check

`pnpm proti:check` validates a configured Proti implementation without changing any files or Sanity documents.

## Add the command

Add this root package script:

```json
"proti:check": "node scripts/proti-check.mjs"
```

## Run it

```bash
pnpm proti:check
```

A healthy implementation reports:

```text
Proti setup check

✓ Project configuration — proti.config.json is valid.
✓ Web environment — web/.env.local
✓ Studio environment — studio/.env.local
✓ Web Sanity project — abc123
✓ Web Sanity dataset — production
✓ Studio Sanity project — abc123
✓ Studio Sanity dataset — production
✓ Sanity connectivity — abc123/production
✓ Sanity Site — site-acme
✓ Site domains — example.com, localhost
✓ Default locale — en-us
✓ Supported locales — en-us, es-us

Proti is ready.
```

## What it checks

The command validates:

- `proti.config.json`
- Web and Studio local environment files
- matching Sanity project and dataset values
- Studio/preview URLs
- generated package names
- configured local tokens/secrets
- Sanity API connectivity
- the seeded Site document
- Site key, domains, default locale, and supported locales

The Sanity check is read-only. It never creates or changes content.

Missing operational secrets are warnings. Configuration errors, package-name mismatches, authentication/connectivity failures, and a missing Site are failures.

If domains/locales were intentionally changed later in Studio, configuration drift is reported as a warning rather than failing the setup check.

## Tests

Add the check test to the existing root test command:

```json
"test:proti": "node --test scripts/proti-init.test.mjs scripts/proti-seed.test.mjs scripts/proti-check.test.mjs"
```

Then run:

```bash
pnpm test:proti
```

The check tests use a local mock HTTP server and never contact a real Sanity project.

`PROTI_SANITY_API_BASE_URL` exists only as a test override. Do not set it during normal Proti development.
