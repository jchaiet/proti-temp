export type TranslatableDocumentType = "page" | "blog";

export interface TranslationLocaleHrefMap {
  [locale: string]: string;
}

export interface TranslationLanguageAlternates {
  [hreflang: string]: string;
}

export interface ResolvedDocumentTranslations {
  localeHrefs: TranslationLocaleHrefMap;

  languageAlternates: TranslationLanguageAlternates;
}
