export const REVALIDATION_DOCUMENT_TYPES = [
  "page",
  "blog",
  "singleton",
  "modal",
  "navigationHeader",
  "navigationFooter",
  "navigationSet",
  "author",
  "taxonomy",
  "redirect",
  "site",
] as const;

export type RevalidationDocumentType =
  (typeof REVALIDATION_DOCUMENT_TYPES)[number];

export interface RevalidationLocale {
  code?: string;
}

export interface RevalidationDocumentSnapshot {
  _id: string;
  _type: RevalidationDocumentType;

  siteId?: string;
  locale?: string;

  slug?: string;
  sourcePath?: string;
  parentId?: string;
  isHomepage?: boolean;

  key?: string;

  defaultLocale?: string;
  locales?: RevalidationLocale[];

  authorId?: string;
  taxonomyIds?: string[];
}

export interface SanityRevalidationPayload {
  before?: RevalidationDocumentSnapshot | null;
  after?: RevalidationDocumentSnapshot | null;
}

export interface RevalidationPlan {
  paths: string[];
  documentId: string;
  documentType: RevalidationDocumentType;
}
