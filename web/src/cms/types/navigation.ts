import type { CmsCta } from "./cta";
import type { CmsIcon } from "./icon";
import type { CmsLink } from "./link";
import type { CmsImage } from "./image";

export type CmsNavigationOverrideMode = "inherit" | "custom" | "none";

export type CmsNavigationReference = {
  _ref: string;
};

export interface CmsNavigationOverride {
  mode?: CmsNavigationOverrideMode;

  navigationSet?: CmsNavigationReference;
}

export type CmsNavigationLogoMode = "site" | "custom" | "none";

export type CmsNavigationAlign = "left" | "center" | "right";

export type CmsNavigationVariant = "standard" | "floating" | "glass";

export interface CmsNavigationLogo {
  mode: CmsNavigationLogoMode;

  customUrl?: string;
  customAlt?: string;

  siteUrl?: string;
  siteAlt?: string;

  siteName?: string;
}

export interface CmsNavigationSubItem {
  _key: string;

  label: string;
  link: CmsLink;

  description?: string;
  icon?: CmsIcon;
  badge?: string;
}

export type CmsNavigationItemMode = "link" | "dropdown" | "mega";
export type CmsNavigationMegaTone = "surface" | "muted" | "accent";
export type CmsNavigationMegaSpan = 1 | 2 | 3 | 4;

export interface CmsNavigationMegaTile {
  _key: string;
  label: string;
  description?: string;
  link?: CmsLink;
  illustration?: CmsImage;
  tone?: CmsNavigationMegaTone;
  span?: CmsNavigationMegaSpan;
}

export interface CmsNavigationMegaCard {
  _key: string;
  _type: "navigationMegaCard";
  title: string;
  eyebrow?: string;
  description?: string;
  link?: CmsLink;
  image?: CmsImage;
  ctaLabel?: string;
  tone?: CmsNavigationMegaTone;
  span?: CmsNavigationMegaSpan;
}

export type CmsNavigationMegaContentItem =
  | (CmsNavigationSubItem & {
      _type: "navigationSubItem";
      span?: CmsNavigationMegaSpan;
    })
  | (CmsNavigationMegaTile & { _type: "navigationMegaTile" })
  | CmsNavigationMegaCard;

export interface CmsNavigationMegaCategory {
  _key: string;
  label: string;
  description?: string;
  icon?: CmsIcon;
  links?: CmsNavigationSubItem[];
}

export type CmsNavigationMegaSection =
  | {
      _key: string;
      _type: "navigationMegaLinksSection";
      title?: string;
      span?: CmsNavigationMegaSpan;
      items?: CmsNavigationSubItem[];
    }
  | {
      _key: string;
      _type: "navigationMegaTilesSection";
      title?: string;
      span?: CmsNavigationMegaSpan;
      columns?: 1 | 2 | 3;
      items?: CmsNavigationMegaTile[];
    }
  | {
      _key: string;
      _type: "navigationMegaContentSection";
      title?: string;
      span?: CmsNavigationMegaSpan;
      columns?: 1 | 2 | 3;
      items?: CmsNavigationMegaContentItem[];
    }
  | {
      _key: string;
      _type: "navigationMegaExplorerSection";
      title?: string;
      span?: CmsNavigationMegaSpan;
      items?: CmsNavigationMegaCategory[];
    }
  | {
      _key: string;
      _type: "navigationMegaFeatureSection";
      presentation?: "tile" | "card";
      ctaLabel?: string;
      title: string;
      eyebrow?: string;
      description?: string;
      link?: CmsLink;
      illustration?: CmsImage;
      tone?: CmsNavigationMegaTone;
      span?: CmsNavigationMegaSpan;
    };

export interface CmsNavigationMegaMenu {
  columns?: 2 | 3 | 4 | 5;
  sections?: CmsNavigationMegaSection[];
}

export interface CmsNavigationItem {
  _key: string;

  label: string;
  link?: CmsLink;
  mode?: CmsNavigationItemMode;

  badge?: string;

  children?: CmsNavigationSubItem[];
  megaMenu?: CmsNavigationMegaMenu;
}

export interface CmsNavigationHeader {
  _id: string;

  title: string;
  key: string;

  logo: CmsNavigationLogo;

  align?: CmsNavigationAlign;
  variant?: CmsNavigationVariant;
  isSticky?: boolean;

  items?: CmsNavigationItem[];

  utilityActions?: CmsCta[];
}

export interface CmsFooterLink {
  _key: string;

  label: string;
  link: CmsLink;

  badge?: string;
}

export interface CmsFooterColumn {
  _key: string;

  title: string;

  links?: CmsFooterLink[];
}

export interface CmsNavigationSocialLink {
  _key: string;

  label: string;
  icon?: CmsIcon;
  link: CmsLink;
}

export interface CmsNavigationFooter {
  _id: string;

  title: string;
  key: string;

  logo: CmsNavigationLogo;

  description?: string;

  columns?: CmsFooterColumn[];

  socialLinks?: CmsNavigationSocialLink[];

  legalLinks?: CmsFooterLink[];

  copyright?: string;
}

export interface CmsNavigationSet {
  _id: string;

  title: string;
  key: string;

  siteId: string;
  locale: string;

  headerMode?: "custom" | "none";
  footerMode?: "custom" | "none";

  header?: CmsNavigationHeader;
  footer?: CmsNavigationFooter;
}
