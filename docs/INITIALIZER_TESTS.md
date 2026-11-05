# Proti Initializer Tests

The Proti setup workflow is covered by dependency-free tests using Node's built-in test runner.

Run from the repository root:

```bash
pnpm test:proti
```

## Covered behavior

The suite verifies:

- a fresh clone uses generic defaults
- a fresh clone does not prefill a real Sanity project ID
- locale defaults are `en-us` and `es-us`
- locale validation uses language-region order
- project/domain/locale normalization works
- rerunning `proti:init` reuses existing local values
- rerunning `proti:init` preserves local Sanity tokens/secrets
- `proti:seed` generates the expected Site document
- `proti:seed` is a no-op when the Site already exists
- a read-only Sanity token returns a useful permission error
- a missing write token returns a useful setup error

## Sanity isolation

Seed tests do not contact the real Sanity Content Lake.

`proti-seed.mjs` supports an internal test override:

```text
PROTI_SANITY_API_BASE_URL
```

Production/local usage should not set this variable. Without it, seed requests continue to use:

```text
https://<project-id>.api.sanity.io
```

## CI

Add the following step to the required `Studio` job after Node setup:

```yaml
- name: Test Proti setup
  run: pnpm test:proti
```

Because the tests use only built-in Node modules, they do not require a separate dependency installation.
