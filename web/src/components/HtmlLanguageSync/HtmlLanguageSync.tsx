"use client";

import { useEffect } from "react";

import { usePathname } from "next/navigation";

import {
  resolveLocaleCodeFromPathname,
  siteLocaleToLanguageTag,
} from "@/lib/routing/locale";

export interface HtmlLanguageSyncProps {
  defaultLocale: string;
  locales: string[];
}

/**
 * Root layouts are reused during client-side navigation in Next.js, so the
 * server-rendered <html lang> value does not automatically change when a Link
 * crosses locale prefixes.
 *
 * The initial HTML is set correctly by RootLayout for crawlers. This client
 * helper keeps the attribute correct after in-app navigations as well.
 */
export function HtmlLanguageSync({
  defaultLocale,
  locales,
}: HtmlLanguageSyncProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === null) return;

    const locale = resolveLocaleCodeFromPathname({
      pathname,
      defaultLocale,
      locales,
    });

    document.documentElement.lang = siteLocaleToLanguageTag(locale);
  }, [defaultLocale, locales, pathname]);

  return null;
}
