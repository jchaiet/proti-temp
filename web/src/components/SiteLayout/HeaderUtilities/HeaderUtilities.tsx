"use client";

import { useEffect, useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { getAppMessages } from "@/i18n/messages";

import styles from "./styles.module.css";

export interface HeaderLocale {
  code: string;
  label?: string;
}

export interface HeaderUtilitiesProps {
  locale: string;
  defaultLocale: string;
  locales: HeaderLocale[];

  /**
   * Exact translated content URLs keyed by Site locale.
   *
   * Only locales with an exact translated equivalent are offered
   * by the language selector. If no alternate translation exists,
   * the entire language control is hidden.
   */
  localeHrefs?: Record<string, string>;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function LanguageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 0 20" />
      <path d="M12 2a15.3 15.3 0 0 0 0 20" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function formatMessage(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return values[key] ?? match;
  });
}

function getLanguageCode(locale: string): string {
  const parts = locale.split("-").filter(Boolean);

  const language = parts.at(0) ?? locale;

  return language.toUpperCase();
}

function appendQueryString(pathname: string, queryString: string): string {
  if (!queryString) {
    return pathname;
  }

  return `${pathname}?${queryString}`;
}

export function HeaderUtilities({
  locale,
  defaultLocale,
  locales,
  localeHrefs,
}: HeaderUtilitiesProps) {
  const searchParams = useSearchParams();

  const queryString = searchParams?.toString() ?? "";

  const uiLabels = getAppMessages(locale).headerUtilities;

  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const languageControlRef = useRef<HTMLDivElement>(null);

  const languageTriggerRef = useRef<HTMLButtonElement>(null);

  const configuredLocales = locales.filter((item) => Boolean(item.code));

  const searchHref = locale === defaultLocale ? "/search" : `/${locale}/search`;

  const hasExactLocaleHref = (targetLocale: string): boolean =>
    Boolean(localeHrefs?.[targetLocale]);

  /*
   * The language control is a translation selector, not a site-locale
   * switcher. Only exact translated equivalents are offered.
   *
   * The current locale remains in the internal list so the active
   * language can be represented when alternates exist, but it is
   * removed from the dropdown itself.
   */
  const validLocales = configuredLocales.filter(
    (item) => item.code === locale || hasExactLocaleHref(item.code),
  );

  const getLocaleHref = (targetLocale: string): string | null => {
    const exactHref = localeHrefs?.[targetLocale];

    if (!exactHref) {
      return null;
    }

    return appendQueryString(exactHref, queryString);
  };

  const availableLocales = validLocales
    .filter((item) => item.code !== locale)
    .map((item) => ({
      locale: item,
      href: getLocaleHref(item.code),
    }))
    .filter(
      (
        item,
      ): item is {
        locale: HeaderLocale;
        href: string;
      } => Boolean(item.href),
    );

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        !languageControlRef.current?.contains(target)
      ) {
        setIsLanguageMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsLanguageMenuOpen(false);
      languageTriggerRef.current?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLanguageMenuOpen]);

  const renderLanguageControl = () => {
    /*
     * No valid alternate destination means there is nothing to switch to,
     * so the entire language control stays hidden.
     */
    if (availableLocales.length === 0) {
      return null;
    }

    const currentLocaleLabel = getLanguageCode(locale);

    return (
      <div className={styles.languageControl} ref={languageControlRef}>
        <button
          ref={languageTriggerRef}
          type="button"
          className={`${styles.utilityButton} ${styles.languageTrigger}`}
          aria-label={formatMessage(uiLabels.currentLanguage, {
            language: currentLocaleLabel,
          })}
          aria-haspopup="menu"
          aria-expanded={isLanguageMenuOpen}
          onClick={() => setIsLanguageMenuOpen((open) => !open)}
        >
          <span className={styles.languageIcon}>
            <LanguageIcon />
          </span>

          <span className={styles.languageCurrent}>{currentLocaleLabel}</span>

          <span
            className={`${styles.languageChevron} ${
              isLanguageMenuOpen ? styles.languageChevronOpen : ""
            }`}
          >
            <ChevronDownIcon />
          </span>
        </button>

        {isLanguageMenuOpen ? (
          <div
            className={styles.languageMenu}
            role="menu"
            aria-label={uiLabels.availableLanguages}
          >
            {availableLocales.map(({ locale: targetLocale, href }) => (
              <a
                key={targetLocale.code}
                href={href}
                className={styles.languageMenuItem}
                role="menuitem"
                hrefLang={targetLocale.code}
                onClick={() => setIsLanguageMenuOpen(false)}
              >
                {getLanguageCode(targetLocale.code)}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={styles.headerUtilities}>
      <a
        href={searchHref}
        className={`${styles.utilityButton} ${styles.searchButton}`}
        aria-label={uiLabels.search}
      >
        <span className={styles.utilityIcon}>
          <SearchIcon />
        </span>
      </a>
      {renderLanguageControl()}
    </div>
  );
}
