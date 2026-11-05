import type { DocumentListLabels } from "mino-ui/blocks/DocumentListBlock";

export interface DocumentListSortLabels {
  relevance: string;
  newest: string;
  oldest: string;
  "title-asc": string;
  "title-desc": string;
}

export interface DocumentListMessages extends DocumentListLabels {
  sortOptions: DocumentListSortLabels;
}

export interface HeaderUtilitiesLabels {
  search: string;
  currentLanguage: string;
  availableLanguages: string;
}

export interface AuthorMessages {
  articlesWrittenBy: string;
  noPublishedArticles: string;
  expertiseAndCredentials: string;
  areasOfExpertise: string;
  credentials: string;
  affiliation: string;
  website: string;
}

export interface BlogMessages {
  by: string;
  editorialInformation: string;
  updated: string;
  reviewedBy: string;
  reviewedOn: string;
  sources: string;
}

export interface AppMessages {
  documentList: DocumentListMessages;
  headerUtilities: HeaderUtilitiesLabels;
  author: AuthorMessages;
  blog: BlogMessages;
}
