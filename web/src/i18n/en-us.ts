import type { AppMessages } from "./types";

export const enUsMessages: AppMessages = {
  documentList: {
    documentFilters: "Document filters",
    filterOptions: "Filter options",
    clearFilters: "Clear Filters",
    sortDocuments: "Sort documents",
    loadingDocuments: "Loading documents.",
    loadingItems: "Loading items...",
    resultStatusSingular: "{count} document available.",
    resultStatusPlural: "{count} documents available.",
    pagination: "Pagination",
    previous: "Previous",
    next: "Next",
    pageInfo: "Page {currentPage} of {totalPages}",
    pageInfoWithTotal:
      "Page {currentPage} of {totalPages} ({totalResults} total)",
    sortOptions: {
      relevance: "Relevance",
      newest: "Newest",
      oldest: "Oldest",
      "title-asc": "Title A–Z",
      "title-desc": "Title Z–A",
    },
  },
  headerUtilities: {
    search: "Search",
    currentLanguage: "Current language: {language}. Choose language",
    availableLanguages: "Available languages",
  },
  blog: {
    by: "By",
    editorialInformation: "Article editorial information",
    updated: "Updated",
    reviewedBy: "Reviewed by",
    reviewedOn: "on",
    sources: "Sources",
  },
  author: {
    articlesWrittenBy: "Articles Written By {name}",
    noPublishedArticles: "No published articles by {name} yet.",
    expertiseAndCredentials: "Expertise & Credentials",
    areasOfExpertise: "Expertise",
    credentials: "Credentials",
    affiliation: "Affiliation",
    website: "Website",
  },
};
