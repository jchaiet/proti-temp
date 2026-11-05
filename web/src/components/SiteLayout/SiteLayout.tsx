import type { ReactNode } from "react";

import type { CmsNavigationOverride } from "@/cms/types";

import {
  mapNavigationFooter,
  mapNavigationHeader,
} from "@/cms/mappers/navigation";

import { resolveNavigation } from "@/cms/resolvers/navigation";

import { resolveSiteLocales } from "@/sanity/queries/site";

import { ModalRegistry } from "@/components/ModalRegistry";

import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

import styles from "./styles.module.css";

export interface SiteLayoutProps {
  siteId: string;
  locale: string;

  navigationOverride?: CmsNavigationOverride;

  homeHref?: string;

  /**
   * Exact translated CMS-document URLs keyed by Site locale.
   *
   * Only exact translated equivalents are exposed in the language selector.
   * If no alternate translation exists, the language control is hidden.
   */
  localeHrefs?: Record<string, string>;

  visualEditing?: boolean;

  children: ReactNode;
}

export async function SiteLayout({
  siteId,
  locale,
  navigationOverride,
  homeHref = "/",
  localeHrefs,
  visualEditing = false,
  children,
}: SiteLayoutProps) {
  const [navigation, localeConfig] = await Promise.all([
    resolveNavigation({
      siteId,
      locale,
      override: navigationOverride,
      visualEditing,
    }),

    resolveSiteLocales(siteId),
  ]);

  const [header, footer] = await Promise.all([
    mapNavigationHeader(navigation?.header),
    mapNavigationFooter(navigation?.footer),
  ]);

  const defaultLocale = localeConfig?.defaultLocale ?? locale;

  const locales = localeConfig?.locales ?? [];

  return (
    <div data-mino-theme className={styles.siteLayout}>
      {header ? (
        <SiteHeader
          header={header}
          homeHref={homeHref}
          locale={locale}
          defaultLocale={defaultLocale}
          locales={locales}
          localeHrefs={localeHrefs}
        />
      ) : null}

      <div className={styles.main}>{children}</div>

      {footer ? <SiteFooter footer={footer} homeHref={homeHref} /> : null}

      <ModalRegistry
        siteId={siteId}
        locale={locale}
        visualEditing={visualEditing}
      />
    </div>
  );
}
