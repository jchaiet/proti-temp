"use client";

import { Button } from "mino-ui/core/Button";
import { ButtonGroup } from "mino-ui/core/ButtonGroup";
import { Navigation } from "mino-ui/core/Navigation";

import type { MappedNavigationHeader } from "@/cms/mappers/navigation";

import { HeaderUtilities } from "./HeaderUtilities";

import type { HeaderLocale } from "./HeaderUtilities";

import { SiteLogo } from "./SiteLogo";

export interface SiteHeaderProps {
  header: MappedNavigationHeader;

  homeHref: string;

  locale: string;
  defaultLocale: string;
  locales: HeaderLocale[];

  localeHrefs?: Record<string, string>;
}

export function SiteHeader({
  header,
  homeHref,
  locale,
  defaultLocale,
  locales,
  localeHrefs,
}: SiteHeaderProps) {
  const logo = header.logo ? (
    <SiteLogo logo={header.logo} href={homeHref} />
  ) : undefined;

  const hasCmsUtilities = header.utilityActions.length > 0;

  const utilityActions = (
    <>
      <HeaderUtilities
        locale={locale}
        defaultLocale={defaultLocale}
        locales={locales}
        localeHrefs={localeHrefs}
      />

      {hasCmsUtilities && (
        <ButtonGroup>
          {header.utilityActions.map((button, index) => (
            <Button key={`header-utility-${index}`} {...button} />
          ))}
        </ButtonGroup>
      )}
    </>
  );

  return (
    <Navigation
      logo={logo}
      items={header.items}
      align={header.align}
      variant={header.variant}
      isSticky={header.isSticky}
      utilityActions={utilityActions}
    />
  );
}
