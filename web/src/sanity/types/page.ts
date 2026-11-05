import type { CmsSeo } from "@/cms/types";

export type PageReference = {
  _ref: string;
};

export type PageNavigationMode = "inherit" | "custom" | "none";

export type PageNavigation = {
  mode?: PageNavigationMode;

  navigationSet?: PageReference;
};

export type Page = {
  _id: string;

  title: string;
  slug?: string;

  locale: string;

  isHomepage?: boolean;

  parent?: PageReference;

  navigation?: PageNavigation;

  seo?: CmsSeo;
};
