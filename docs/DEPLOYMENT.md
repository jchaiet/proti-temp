# Deployment and Sanity revalidation

This guide describes the shipped runtime contracts. Infrastructure settings and production secrets must be checked in the actual hosting/CI accounts before release.

## Production Web

Proti Web is a Next.js application. The existing documentation describes Vercel as the production host; deploy the **`web/` app** with its runtime environment values. Ensure the local `mino-ui-<version>.tgz` file is available during dependency installation if the dependency remains a file tarball.

Set Web env values in the deployment environment, including `NEXT_SANITY_PROJECT_ID`, `NEXT_SANITY_DATASET`, `NEXT_SANITY_STUDIO_URL`, and the server-only Sanity tokens and revalidation secret as needed. Values in GitHub Actions secrets are **not automatically** shared with Vercel.

Ensure the Site document's `domains` include the live hostname; set the desired `canonicalDomain` explicitly. After deployment, verify a published homepage and SEO origin before moving DNS or promoting traffic.

## Sanity Studio

The Studio build command is `pnpm build` from `studio/`; its optional publish command is `pnpm deploy`. Its configuration reads `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`, `SANITY_STUDIO_TITLE`, and `SANITY_STUDIO_PREVIEW_URL` (see `studio/sanity.config.ts`). The Presentation preview URL must target the correct Web deployment, and the preview origin must be allowed.

## Sanity publish webhook

The Web API endpoint is:

```text
POST https://<web-host>/api/revalidate
```

`web/src/app/api/revalidate/route.ts` uses `next-sanity/webhook` signature verification with `SANITY_REVALIDATE_SECRET`. It rejects invalid signatures and invokes the dependency-based plan in `web/src/cms/revalidation/dependencies.ts` before calling `revalidatePath()`.

**Do not hand-write an incomplete webhook payload.** The canonical filter/projection are exported by `web/src/cms/revalidation/webhook.ts`. Use those exact values when configuring a Sanity document webhook:

- Deployed endpoint URL, with the shared secret
- Include drafts: **off**
- Include versions: **off**
- Filter and projection from the source module, including `before()` and `after()` document snapshots

This lets Proti invalidate old and new routes when route-defining fields change, including slug, hierarchy and locale. Confirm the deployment receives the signed event and the published frontend updates without a rebuild.

## Draft Mode / Presentation

Preview APIs are under `web/src/app/api/draft-mode/`. Draft Mode uses the Sanity drafts perspective and `SANITY_API_READ_TOKEN`, with Sanity Live for visual editing. Keep drafts, signed endpoints, tokens, and public published content separate. Confirm Studio `SANITY_STUDIO_PREVIEW_URL` and Web `NEXT_SANITY_STUDIO_URL` agree with the actual deployments.

## Release deployment checklist

1. Confirm package versions, local Mino tarball and lockfile alignment.
2. Run all automated suites; require configured CI checks to pass.
3. Confirm no live secret was committed, copied into artifacts, or exposed via public variables.
4. Verify Site host/canonical domain, default locale and navigation.
5. Deploy Studio/Web to the intended Sanity dataset and host.
6. Check homepage, Blog, Author, translation routes, canonical/hreflang, sitemap and robots.
7. Publish and revert an innocuous change to one Page and Blog on the **deployed** Site, confirming webhook revalidation both times.
8. Review errors/logs and only then tag/promote the release.

For branch rules see [CI Branch Protection](CI_BRANCH_PROTECTION.md); confirm rules against actual `.github` files because they were not present in the documentation source archive.
