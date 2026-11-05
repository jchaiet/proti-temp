import { createElement } from "react";
import type { ReactNode } from "react";
import Image from "next/image";

import type { ButtonProps } from "mino-ui/core/Button";
import type {
  NavItem,
  NavMegaMenu,
  NavMegaSection,
  NavMegaTile,
  NavMegaCard,
  NavMegaContentItem,
  NavSubItem,
} from "mino-ui/core/Navigation";

import type {
  CmsFooterColumn,
  CmsFooterLink,
  CmsNavigationFooter,
  CmsNavigationHeader,
  CmsNavigationItem,
  CmsNavigationMegaMenu,
  CmsNavigationMegaTile,
  CmsNavigationMegaContentItem,
  CmsNavigationMegaSection,
  CmsNavigationLogo,
  CmsNavigationSocialLink,
  CmsNavigationSubItem,
  CmsImage,
} from "@/cms/types";

import { mapCtas } from "@/cms/mappers/cta";

import { resolveIcon } from "@/cms/resolvers/icon";
import { resolveSanityImage } from "@/cms/resolvers/image";
import { resolveLink } from "@/cms/resolvers/link";

export interface MappedNavigationLogo {
  src?: string;
  alt: string;
  text?: string;
}

export interface MappedNavigationHeader {
  logo: MappedNavigationLogo | null;

  items: NavItem[];

  align: "left" | "center" | "right";
  variant: "standard" | "floating" | "glass";
  isSticky: boolean;

  utilityActions: ButtonProps[];
}

export interface MappedFooterLink {
  key: string;

  label: string;
  href: string;

  badge?: string;

  target?: "_blank";
  rel?: string;
}

export interface MappedFooterColumn {
  key: string;

  title: string;

  links: MappedFooterLink[];
}

export interface MappedNavigationSocialLink {
  key: string;

  label: string;
  href: string;

  target?: "_blank";
  rel?: string;

  icon?: ReactNode;
}

export interface MappedNavigationFooter {
  logo: MappedNavigationLogo | null;

  description?: string;

  columns: MappedFooterColumn[];

  socialLinks: MappedNavigationSocialLink[];

  legalLinks: MappedFooterLink[];

  copyright?: string;
}

function mapLogo(logo: CmsNavigationLogo): MappedNavigationLogo | null {
  switch (logo.mode) {
    case "none":
      return null;

    case "custom":
      if (!logo.customUrl) {
        return null;
      }

      return {
        src: logo.customUrl,
        alt: logo.customAlt ?? "",
      };

    case "site":
    default:
      if (logo.siteUrl) {
        return {
          src: logo.siteUrl,
          alt: logo.siteAlt ?? logo.siteName ?? "",
          text: logo.siteName,
        };
      }

      if (logo.siteName) {
        return {
          alt: logo.siteName,
          text: logo.siteName,
        };
      }

      return null;
  }
}

async function mapSubItem(
  item: CmsNavigationSubItem,
): Promise<NonNullable<NavItem["children"]>[number] | null> {
  const link = await resolveLink(item.link);

  if (!link) {
    return null;
  }

  return {
    label: item.label,
    href: link.href,
    target: link.target,
    rel: link.rel,

    description: item.description,

    icon: resolveIcon(item.icon),

    badge: item.badge,
  };
}

/** Render a Sanity image as a React node accepted by Mino's illustration slot. */
function mapMegaIllustration(image?: CmsImage): ReactNode {
  const src = resolveSanityImage(image, {
    width: 640,
    height: 360,
    quality: 85,
  });

  return src
    ? createElement(Image, {
        src,
        alt: image?.alt ?? "",
        width: 640,
        height: 360,
        sizes: "(max-width: 868px) 100vw, 30vw",
        unoptimized: true,
      })
    : undefined;
}

async function mapMegaSubItems(
  items?: CmsNavigationSubItem[],
): Promise<NavSubItem[]> {
  const resolved = await Promise.all((items ?? []).map(mapSubItem));
  return resolved.filter((item): item is NavSubItem => item !== null);
}

async function mapMegaTile(
  tile: CmsNavigationMegaTile,
): Promise<NavMegaTile | null> {
  const link = tile.link ? await resolveLink(tile.link) : undefined;
  if (!link) return null;
  return {
    label: tile.label,
    description: tile.description,
    href: link.href,
    target: link.target,
    rel: link.rel,
    tone: tile.tone,
    span: tile.span,
    illustration: mapMegaIllustration(tile.illustration),
  };
}

async function mapMegaContentItem(
  item: CmsNavigationMegaContentItem,
): Promise<NavMegaContentItem | null> {
  if (item._type === "navigationSubItem") {
    const mapped = await mapSubItem(item);
    return mapped ? { ...mapped, type: "link", span: item.span } : null;
  }
  if (item._type === "navigationMegaTile") {
    const mapped = await mapMegaTile(item);
    return mapped ? { ...mapped, type: "tile" } : null;
  }
  const link = item.link ? await resolveLink(item.link) : undefined;
  if (!link) return null;
  const card: NavMegaCard = {
    title: item.title,
    eyebrow: item.eyebrow,
    description: item.description,
    href: link.href,
    target: link.target,
    rel: link.rel,
    image: mapMegaIllustration(item.image),
    ctaLabel: item.ctaLabel,
    tone: item.tone,
    span: item.span,
  };
  return { type: "card", ...card };
}

async function mapMegaSection(
  section: CmsNavigationMegaSection,
): Promise<NavMegaSection | null> {
  switch (section._type) {
    case "navigationMegaLinksSection": {
      const items = await mapMegaSubItems(section.items);
      return items.length > 0
        ? { type: "links", title: section.title, span: section.span, items }
        : null;
    }

    case "navigationMegaTilesSection": {
      const items = (
        await Promise.all((section.items ?? []).map(mapMegaTile))
      ).filter((tile): tile is NavMegaTile => tile !== null);

      return items.length > 0
        ? {
            type: "tiles",
            title: section.title,
            span: section.span,
            columns: section.columns,
            items,
          }
        : null;
    }

    case "navigationMegaContentSection": {
      const items = (
        await Promise.all((section.items ?? []).map(mapMegaContentItem))
      ).filter((item): item is NavMegaContentItem => item !== null);
      return items.length > 0
        ? {
            type: "content",
            title: section.title,
            span: section.span,
            columns: section.columns,
            items,
          }
        : null;
    }

    case "navigationMegaExplorerSection": {
      const items = (
        await Promise.all(
          (section.items ?? []).map(async (category) => ({
            label: category.label,
            description: category.description,
            icon: resolveIcon(category.icon),
            links: await mapMegaSubItems(category.links),
          })),
        )
      ).filter((category) => category.links.length > 0);

      return items.length > 0
        ? { type: "explorer", title: section.title, span: section.span, items }
        : null;
    }

    case "navigationMegaFeatureSection": {
      const link = section.link ? await resolveLink(section.link) : undefined;
      return {
        type: "feature",
        presentation: section.presentation,
        ctaLabel: section.ctaLabel,
        title: section.title,
        eyebrow: section.eyebrow,
        description: section.description,
        span: section.span,
        tone: section.tone,
        href: link?.href,
        target: link?.target,
        rel: link?.rel,
        illustration: mapMegaIllustration(section.illustration),
      };
    }
  }
}

async function mapMegaMenu(
  menu?: CmsNavigationMegaMenu,
): Promise<NavMegaMenu | null> {
  if (!menu) return null;
  const sections = (
    await Promise.all((menu.sections ?? []).map(mapMegaSection))
  ).filter((section): section is NavMegaSection => section !== null);

  return sections.length > 0 ? { columns: menu.columns, sections } : null;
}

async function mapNavigationItem(
  item: CmsNavigationItem,
): Promise<NavItem | null> {
  // Explicitly authored Mega Menus take precedence; preserve the legacy
  // inference behavior for documents created before the Navigation Type field.
  if (item.mode === "mega" || (!item.mode && item.megaMenu)) {
    const megaMenu = await mapMegaMenu(item.megaMenu);
    return megaMenu ? { label: item.label, badge: item.badge, megaMenu } : null;
  }

  if (item.mode === "dropdown" || !item.mode) {
    const children = await mapMegaSubItems(item.children);
    if (children.length > 0) {
      return { label: item.label, badge: item.badge, children };
    }
    if (item.mode === "dropdown") return null;
  }

  if (!item.link) return null;
  const link = await resolveLink(item.link);
  if (!link) return null;

  return {
    label: item.label,
    href: link.href,
    target: link.target,
    rel: link.rel,
    badge: item.badge,
  };
}

async function mapFooterLink(
  link: CmsFooterLink,
): Promise<MappedFooterLink | null> {
  const resolved = await resolveLink(link.link);

  if (!resolved) {
    return null;
  }

  return {
    key: link._key,

    label: link.label,
    href: resolved.href,

    badge: link.badge,

    target: resolved.target,
    rel: resolved.rel,
  };
}

async function mapFooterColumn(
  column: CmsFooterColumn,
): Promise<MappedFooterColumn> {
  const links = (
    await Promise.all((column.links ?? []).map(mapFooterLink))
  ).filter((link): link is MappedFooterLink => link !== null);

  return {
    key: column._key,

    title: column.title,

    links,
  };
}

async function mapSocialLink(
  social: CmsNavigationSocialLink,
): Promise<MappedNavigationSocialLink | null> {
  const link = await resolveLink(social.link);

  if (!link) {
    return null;
  }

  return {
    key: social._key,

    label: social.label,
    href: link.href,

    target: link.target,
    rel: link.rel,

    icon: resolveIcon(social.icon),
  };
}

export async function mapNavigationHeader(
  header: CmsNavigationHeader | undefined,
): Promise<MappedNavigationHeader | null> {
  if (!header) {
    return null;
  }

  const items = (
    await Promise.all((header.items ?? []).map(mapNavigationItem))
  ).filter((item): item is NavItem => item !== null);

  const utilityActions = await mapCtas(header.utilityActions);

  return {
    logo: mapLogo(header.logo),

    items,

    align: header.align ?? "center",
    variant: header.variant ?? "standard",
    isSticky: header.isSticky ?? true,

    utilityActions,
  };
}

export async function mapNavigationFooter(
  footer: CmsNavigationFooter | undefined,
): Promise<MappedNavigationFooter | null> {
  if (!footer) {
    return null;
  }

  const [columns, socialLinks, legalLinks] = await Promise.all([
    Promise.all((footer.columns ?? []).map(mapFooterColumn)),

    Promise.all((footer.socialLinks ?? []).map(mapSocialLink)),

    Promise.all((footer.legalLinks ?? []).map(mapFooterLink)),
  ]);

  return {
    logo: mapLogo(footer.logo),

    description: footer.description,

    columns,

    socialLinks: socialLinks.filter(
      (social): social is MappedNavigationSocialLink => social !== null,
    ),

    legalLinks: legalLinks.filter(
      (link): link is MappedFooterLink => link !== null,
    ),

    copyright: footer.copyright,
  };
}
