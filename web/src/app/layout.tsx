import type { Metadata } from "next";
import { draftMode, headers } from "next/headers";

import { HtmlLanguageSync } from "@/components/HtmlLanguageSync";
import {
  resolveLocaleCodeFromPathname,
  siteLocaleToLanguageTag,
} from "@/lib/routing/locale";
import { resolveSiteByHostCached } from "@/sanity/queries/site";

import "./globals.css";

export const metadata: Metadata = {
  title: "Website Starter",
  description: "Starter template for websites",
};

function getRequestHost(
  requestHeaders: Awaited<ReturnType<typeof headers>>,
): string | null {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const hostHeader = requestHeaders.get("host");

  return forwardedHost?.split(",")[0]?.trim() ?? hostHeader?.trim() ?? null;
}

interface RootLocaleContext {
  htmlLang: string;
  defaultLocale: string;
  localeCodes: string[];
}

async function resolveRootLocaleContext(
  host: string | null,
  pathname: string,
): Promise<RootLocaleContext | null> {
  if (!host) {
    return null;
  }

  try {
    const site = await resolveSiteByHostCached(host);

    if (!site) {
      return null;
    }

    const localeCodes = site.locales.map((item) => item.code).filter(Boolean);

    const locale = resolveLocaleCodeFromPathname({
      pathname,
      defaultLocale: site.defaultLocale,
      locales: localeCodes,
    });

    return {
      htmlLang: siteLocaleToLanguageTag(locale),
      defaultLocale: site.defaultLocale,
      localeCodes,
    };
  } catch {
    /*
     * Keep the root document usable if Site resolution is temporarily
     * unavailable. The catch-all route will continue to handle its own
     * CMS/error behavior, while the document falls back to English.
     */
    return null;
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ isEnabled: isDraftMode }, requestHeaders] = await Promise.all([
    draftMode(),
    headers(),
  ]);

  const host = getRequestHost(requestHeaders);
  const pathname = requestHeaders.get("x-proti-pathname") ?? "/";
  const localeContext = await resolveRootLocaleContext(host, pathname);

  const htmlLang = localeContext?.htmlLang ?? "en";

  // Load preview-only dependencies on the server exclusively for draft requests.
  // Published requests should not reference Sanity's editing client bundles.
  const PreviewTools = isDraftMode
    ? (await import("@/components/Preview/PreviewTools")).PreviewTools
    : null;

  return (
    <html lang={htmlLang}>
      <body>
        {localeContext ? (
          <HtmlLanguageSync
            defaultLocale={localeContext.defaultLocale}
            locales={localeContext.localeCodes}
          />
        ) : null}
        {children}
        {PreviewTools ? <PreviewTools /> : null}{" "}
      </body>
    </html>
  );
}
