import type { CmsBlog, CmsCitationSource } from "@/cms/types";

import { BlockRenderer } from "@/components/BlockRenderer";
import { getAppMessages } from "@/i18n";
import { siteLocaleToLanguageTag } from "@/lib/routing/locale";
import { BlogHero } from "./BlogHero";

import styles from "./styles.module.css";

export interface BlogTemplateProps {
  blog: CmsBlog;

  /**
   * Empty for the default locale.
   *
   * Example:
   * /es-us
   */
  localePrefix?: string;

  visualEditing?: boolean;
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) {
    return "";
  }

  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;

  return normalized.replace(/\/+$/, "");
}

function getAuthorSlug(author: CmsBlog["author"]): string | undefined {
  if (!author || typeof author !== "object") {
    return undefined;
  }

  const slug = (
    author as {
      slug?: unknown;
    }
  ).slug;

  return typeof slug === "string" && slug ? slug : undefined;
}

function getAuthorHref(
  author: CmsBlog["author"] | CmsBlog["reviewer"],
  locale: string,
  localePrefix?: string,
): string | undefined {
  const slug = getAuthorSlug(author);

  if (!slug) {
    return undefined;
  }

  /*
   * Older content may not have availability metadata yet. Preserve the
   * current-locale behavior in that case. When availability is known, only
   * use the localized Author route if that Author actually has that locale.
   * Otherwise fall back to the unprefixed default-locale Author profile.
   */
  const hasAvailabilityMetadata = Boolean(author?.availableLocales?.length);
  const hasCurrentLocale = author?.availableLocales?.includes(locale) ?? false;

  const prefix =
    !hasAvailabilityMetadata || hasCurrentLocale
      ? normalizePrefix(localePrefix)
      : "";

  return `${prefix}/authors/${slug}`;
}

function formatPublishedDate(
  date: string | undefined,
  locale: string,
): string | undefined {
  if (!date) {
    return undefined;
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  try {
    return new Intl.DateTimeFormat(siteLocaleToLanguageTag(locale), {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(parsed);
  }
}

function CitationSource({
  source,
  locale,
}: {
  source: CmsCitationSource;
  locale: string;
}) {
  const publicationDate = formatPublishedDate(source.publicationDate, locale);

  return (
    <li>
      <cite>
        {source.url ? (
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.title}
          </a>
        ) : (
          source.title
        )}
      </cite>

      {source.publisher || publicationDate ? (
        <span className={styles.sourceMeta}>
          {source.publisher ? <span>{source.publisher}</span> : null}

          {source.publisher && publicationDate ? " • " : null}

          {publicationDate && source.publicationDate ? (
            <time dateTime={source.publicationDate}>{publicationDate}</time>
          ) : (
            publicationDate
          )}
        </span>
      ) : null}
    </li>
  );
}

export async function BlogTemplate({
  blog,
  localePrefix,
  visualEditing = false,
}: BlogTemplateProps) {
  const messages = getAppMessages(blog.locale).blog;

  const publishedDate = formatPublishedDate(blog.publishedAt, blog.locale);

  const lastModifiedDate = formatPublishedDate(
    blog.lastModifiedAt,
    blog.locale,
  );

  const reviewedDate = formatPublishedDate(blog.reviewedAt, blog.locale);

  const authorHref = getAuthorHref(blog.author, blog.locale, localePrefix);
  const reviewerHref = getAuthorHref(blog.reviewer, blog.locale, localePrefix);

  const hasEditorialDetails = Boolean(
    lastModifiedDate || blog.reviewer?.name || reviewedDate,
  );

  return (
    <article>
      <BlogHero
        title={blog.title}
        summary={blog.summary}
        showSummary={blog.showSummaryInArticle}
        authorName={blog.author?.name}
        authorHref={authorHref}
        bylineLabel={messages.by}
        taxonomy={blog.taxonomy}
        localePrefix={localePrefix}
        publishedDate={publishedDate}
        publishedDateTime={blog.publishedAt}
        imageUrl={blog.imageUrl}
        imageWidth={blog.imageWidth}
        imageHeight={blog.imageHeight}
        imageSrcSet={blog.imageSrcSet}
        imageAlt={blog.imageAlt}
      />

      {hasEditorialDetails ? (
        <aside
          className={styles.editorialMeta}
          aria-label={messages.editorialInformation}
        >
          {lastModifiedDate && blog.lastModifiedAt ? (
            <p>
              <strong>{messages.updated}:</strong>{" "}
              <time dateTime={blog.lastModifiedAt}>{lastModifiedDate}</time>
            </p>
          ) : null}

          {blog.reviewer?.name ? (
            <p>
              <strong>{messages.reviewedBy}:</strong>{" "}
              {reviewerHref ? (
                <a href={reviewerHref}>{blog.reviewer.name}</a>
              ) : (
                blog.reviewer.name
              )}
              {blog.reviewer.jobTitle ? `, ${blog.reviewer.jobTitle}` : ""}
              {reviewedDate && blog.reviewedAt ? (
                <>
                  {" "}
                  {messages.reviewedOn}{" "}
                  <time dateTime={blog.reviewedAt}>{reviewedDate}</time>
                </>
              ) : null}
            </p>
          ) : null}
        </aside>
      ) : null}

      <BlockRenderer
        blocks={blog.sections ?? []}
        context={{
          siteId: blog.siteId,
          locale: blog.locale,
          localePrefix,
          visualEditing,
          priorityHeroImage: false, // BlogHero is already the leading image.
        }}
      />

      {blog.sources?.length ? (
        <section
          className={styles.sources}
          aria-labelledby="article-sources-heading"
        >
          <h2 id="article-sources-heading">{messages.sources}</h2>

          <ol>
            {blog.sources.map((source, index) => (
              <CitationSource
                key={`${source.url ?? source.title}-${index}`}
                source={source}
                locale={blog.locale}
              />
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
