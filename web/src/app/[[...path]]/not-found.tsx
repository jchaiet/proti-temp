import { headers } from "next/headers";

import { ErrorState } from "@/components/ErrorState";
import { SiteLayout } from "@/components/SiteLayout";

import { resolveSiteByHost } from "@/sanity/queries/site";

function getRequestHost(
  requestHeaders: Awaited<ReturnType<typeof headers>>,
): string | null {
  const forwardedHost = requestHeaders.get("x-forwarded-host");

  const hostHeader = requestHeaders.get("host");

  return forwardedHost?.split(",")[0]?.trim() ?? hostHeader?.trim() ?? null;
}

async function resolveNotFoundSite() {
  try {
    const requestHeaders = await headers();

    const host = getRequestHost(requestHeaders);

    if (!host) {
      return null;
    }

    return await resolveSiteByHost(host);
  } catch {
    /*
     * A 404 should remain usable even if tenant/CMS
     * resolution itself is temporarily unavailable.
     */
    return null;
  }
}

function NotFoundContent({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <ErrorState
      code="404"
      title="Page not found"
      message="The page you’re looking for may have moved, been removed, or never existed."
      homeHref={homeHref}
      homeLabel="Return home"
    />
  );
}

export default async function NotFound() {
  /*
   * not-found.tsx receives no route params in Next.js.
   *
   * We can still resolve the current tenant from the Host
   * header and preserve the normal Site header/footer.
   *
   * Because the missing pathname is not exposed to this
   * Server Component as a supported API, the navigation
   * Locale falls back to the Site's default Locale.
   */
  const site = await resolveNotFoundSite();

  if (!site) {
    return <NotFoundContent />;
  }

  return (
    <SiteLayout siteId={site._id} locale={site.defaultLocale} homeHref="/">
      <NotFoundContent />
    </SiteLayout>
  );
}
