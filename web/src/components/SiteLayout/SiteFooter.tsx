import type { AnchorHTMLAttributes } from "react";

import { Footer, FooterColumn, FooterLink } from "mino-ui/core/Footer";

import type {
  MappedFooterLink,
  MappedNavigationFooter,
} from "@/cms/mappers/navigation";

import { SiteLogo } from "./SiteLogo";

export interface SiteFooterProps {
  footer: MappedNavigationFooter;

  homeHref: string;
}

function getAnchorProps(
  link: MappedFooterLink,
): AnchorHTMLAttributes<HTMLAnchorElement> {
  return {
    target: link.target,
    rel: link.rel,
  };
}

export function SiteFooter({ footer, homeHref }: SiteFooterProps) {
  const logo = footer.logo ? (
    <SiteLogo logo={footer.logo} href={homeHref} loading="lazy" />
  ) : undefined;

  const socials =
    footer.socialLinks.length > 0 ? (
      <>
        {footer.socialLinks.map((social) => (
          <a
            key={social.key}
            href={social.href}
            target={social.target}
            rel={social.rel}
            aria-label={social.label}
            title={social.label}
          >
            {social.icon ?? social.label}
          </a>
        ))}
      </>
    ) : undefined;

  const legalLinks =
    footer.legalLinks.length > 0 ? (
      <>
        {footer.legalLinks.map((link) => (
          <FooterLink
            key={link.key}
            href={link.href}
            badge={link.badge}
            {...getAnchorProps(link)}
          >
            {link.label}
          </FooterLink>
        ))}
      </>
    ) : undefined;

  return (
    <Footer
      logo={logo}
      description={footer.description}
      socials={socials}
      copyright={footer.copyright}
      legalLinks={legalLinks}
    >
      {footer.columns.map((column) => (
        <FooterColumn key={column.key} title={column.title}>
          {column.links.map((link) => (
            <FooterLink
              key={link.key}
              href={link.href}
              badge={link.badge}
              {...getAnchorProps(link)}
            >
              {link.label}
            </FooterLink>
          ))}
        </FooterColumn>
      ))}
    </Footer>
  );
}
