"use client";

import { CARD_IMAGE_PRESET_SIZE } from "@/cms/resolvers/image-presets";

import Image from "next/image";

import {
  FaBluesky,
  FaFacebookF,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

import { Button } from "mino-ui/core/Button";
import { ButtonGroup } from "mino-ui/core/ButtonGroup";
import { Divider } from "mino-ui/core/Divider";
import { Heading } from "mino-ui/core/Heading";

import type { ContentBlockProps } from "mino-ui/blocks/ContentBlock";

import { DocumentListBlock } from "mino-ui/blocks/DocumentListBlock";
import type { DocumentItem } from "mino-ui/blocks/DocumentListBlock";

import { RichTextBlock } from "mino-ui/blocks/RichTextBlock";

import { RichText } from "@/components/BlockRenderer/RichText";

import type {
  CmsAuthor,
  CmsAuthorArticle,
  CmsAuthorPage,
} from "@/cms/types/author";

import { getAppMessages } from "@/i18n";

import { siteLocaleToLanguageTag } from "@/lib/routing/locale";

import styles from "./styles.module.css";

export interface AuthorTemplateProps {
  page: CmsAuthorPage;

  /**
   * Empty for the default locale.
   *
   * Example:
   * /es-us
   */
  localePrefix?: string;
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) {
    return "";
  }

  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;

  return normalized.replace(/\/+$/, "");
}

function getBlogHref(slug: string, localePrefix?: string): string {
  const prefix = normalizePrefix(localePrefix);

  return `${prefix}/blog/${slug}`;
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

type SocialNetwork =
  | "bluesky"
  | "facebook"
  | "github"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "x"
  | "youtube"
  | "website";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function getSocialNetwork(url: string): SocialNetwork {
  const hostname = getHostname(url);

  if (hostname === "bsky.app" || hostname.endsWith(".bsky.app")) {
    return "bluesky";
  }

  if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
    return "linkedin";
  }

  if (hostname === "github.com" || hostname.endsWith(".github.com")) {
    return "github";
  }

  if (hostname === "x.com" || hostname.endsWith(".x.com")) {
    return "x";
  }

  if (hostname === "twitter.com" || hostname.endsWith(".twitter.com")) {
    return "twitter";
  }

  if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
    return "instagram";
  }

  if (hostname === "facebook.com" || hostname.endsWith(".facebook.com")) {
    return "facebook";
  }

  if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    return "youtube";
  }

  return "website";
}

function getSocialLabel(url: string, websiteLabel: string): string {
  const network = getSocialNetwork(url);

  switch (network) {
    case "bluesky":
      return "Bluesky";

    case "facebook":
      return "Facebook";

    case "github":
      return "GitHub";

    case "instagram":
      return "Instagram";

    case "linkedin":
      return "LinkedIn";

    case "twitter":
      return "Twitter";

    case "x":
      return "X";

    case "youtube":
      return "YouTube";

    default: {
      const hostname = getHostname(url);

      return hostname || websiteLabel;
    }
  }
}

function getSocialIcon(url: string) {
  const iconProps = {
    size: 18,
    "aria-hidden": true,
    focusable: false,
  } as const;

  switch (getSocialNetwork(url)) {
    case "bluesky":
      return <FaBluesky {...iconProps} />;

    case "facebook":
      return <FaFacebookF {...iconProps} />;

    case "github":
      return <FaGithub {...iconProps} />;

    case "instagram":
      return <FaInstagram {...iconProps} />;

    case "linkedin":
      return <FaLinkedinIn {...iconProps} />;

    case "twitter":
      return <FaTwitter {...iconProps} />;

    case "x":
      return <FaXTwitter {...iconProps} />;

    case "youtube":
      return <FaYoutube {...iconProps} />;

    default:
      return <FaGlobe {...iconProps} />;
  }
}

function buildSocialCtas(
  author: CmsAuthor,
  websiteLabel: string,
): NonNullable<ContentBlockProps["ctas"]> {
  const urls = Array.from(
    new Set(
      [author.profileUrl, ...(author.sameAs ?? [])].filter(
        (url): url is string => Boolean(url),
      ),
    ),
  );

  return urls.map((url) => ({
    as: "a" as const,
    href: url,
    label: getSocialLabel(url, websiteLabel),
    variant: "link" as const,
    size: "sm" as const,
    icon: getSocialIcon(url),
    iconAlignment: "left" as const,
    target: "_blank",
    rel: "noopener noreferrer",
  }));
}

function formatAuthorMessage(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    return values[key] ?? match;
  });
}

function mapArticle(
  article: CmsAuthorArticle,
  author: CmsAuthor,
  locale: string,
  localePrefix?: string,
): DocumentItem {
  return {
    id: article._id,

    contentType: "blog",
    cardType: "article",

    title: article.title,
    summary: article.summary,

    url: getBlogHref(article.slug, localePrefix),

    date: formatPublishedDate(article.publishedAt, locale),

    thumbnail: article.imageUrl,
    ...(article.imageUrl
      ? {
          thumbnailWidth: CARD_IMAGE_PRESET_SIZE.width,
          thumbnailHeight: CARD_IMAGE_PRESET_SIZE.height,
        }
      : {}),
    ...(article.imageUrl && article.imageAlt
      ? { thumbnailAlt: article.imageAlt }
      : {}),

    tags: article.taxonomy?.map((term) => term.title).filter(Boolean),

    author: {
      name: author.name,
      role: author.jobTitle,
      avatarUrl: author.imageUrl,
    },
  };
}

export function AuthorTemplate({ page, localePrefix }: AuthorTemplateProps) {
  const { author, articles } = page;

  const messages = getAppMessages(page.locale).author;

  const socialCtas = buildSocialCtas(author, messages.website);

  const documents = articles.map((article) =>
    mapArticle(article, author, page.locale, localePrefix),
  );

  const hasBio = Boolean(
    author.bioPortableText?.length || author.bioRichText || author.bio,
  );

  const hasExpertiseDetails = Boolean(
    author.expertise?.length ||
    author.credentials?.length ||
    author.affiliation?.name,
  );

  const hasProfileRail = Boolean(author.imageUrl || hasExpertiseDetails);

  return (
    <article className={styles.authorPage}>
      <section className={styles.profile} aria-labelledby="author-name">
        {hasProfileRail ? (
          <div className={styles.profileRail}>
            {author.imageUrl ? (
              <div className={styles.portraitFrame}>
                <Image
                  className={styles.portrait}
                  src={author.imageUrl}
                  alt={author.imageAlt ?? ""}
                  width={480}
                  height={480}
                  sizes="(max-width: 900px) 240px, 300px"
                  unoptimized
                />
              </div>
            ) : null}

            {hasExpertiseDetails ? (
              <aside
                className={styles.expertise}
                aria-label={messages.expertiseAndCredentials}
              >
                {author.expertise?.length ? (
                  <section
                    className={styles.expertiseSection}
                    aria-label={messages.areasOfExpertise}
                  >
                    <p className={styles.expertiseLabel}>
                      {messages.areasOfExpertise}
                    </p>

                    <ul className={styles.expertiseList}>
                      {author.expertise.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {author.credentials?.length ? (
                  <section
                    className={styles.expertiseSection}
                    aria-label={messages.credentials}
                  >
                    <p className={styles.expertiseLabel}>
                      {messages.credentials}
                    </p>

                    <ul className={styles.credentialList}>
                      {author.credentials.map((credential, index) => (
                        <li key={`${credential.name}-${index}`}>
                          {credential.url ? (
                            <a
                              href={credential.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {credential.name}
                            </a>
                          ) : (
                            credential.name
                          )}

                          {[
                            credential.category,
                            credential.recognizedBy,
                            credential.identifier,
                          ].filter(Boolean).length ? (
                            <span className={styles.credentialMeta}>
                              {[
                                credential.category,
                                credential.recognizedBy,
                                credential.identifier,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {author.affiliation?.name ? (
                  <section
                    className={styles.expertiseSection}
                    aria-label={messages.affiliation}
                  >
                    <p className={styles.expertiseLabel}>
                      {messages.affiliation}
                    </p>

                    <p className={styles.affiliation}>
                      {author.affiliation.url ? (
                        <a
                          href={author.affiliation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {author.affiliation.name}
                        </a>
                      ) : (
                        author.affiliation.name
                      )}
                    </p>
                  </section>
                ) : null}
              </aside>
            ) : null}
          </div>
        ) : null}

        <div className={styles.profileContent}>
          <header className={styles.identity}>
            <Heading
              id="author-name"
              level={1}
              size="3xl"
              className={styles.authorName}
            >
              {author.name}
            </Heading>

            {author.jobTitle ? (
              <p className={styles.jobTitle}>{author.jobTitle}</p>
            ) : null}

            {socialCtas.length > 0 ? (
              <ButtonGroup
                alignment="left"
                stackOnMobile={false}
                className={styles.socialLinks}
              >
                {socialCtas.map((ctaProps, index) => (
                  <Button key={`author-social-${index}`} {...ctaProps} />
                ))}
              </ButtonGroup>
            ) : null}
          </header>

          {author.bioPortableText?.length ? (
            <RichText
              className={styles.bio}
              content={author.bioPortableText}
              alignment="left"
              maxWidth="full"
            />
          ) : hasBio ? (
            <RichTextBlock
              className={styles.bio}
              content={author.bioRichText ?? author.bio ?? ""}
              alignment="left"
              maxWidth="full"
            />
          ) : null}
        </div>
      </section>

      <div className={styles.dividerWrap} aria-hidden="true">
        <Divider className={styles.divider} />
      </div>

      <DocumentListBlock
        className={styles.articles}
        title={formatAuthorMessage(messages.articlesWrittenBy, {
          name: author.name,
        })}
        headingProps={{
          level: 2,
          size: "2xl",
        }}
        documents={documents}
        defaultCardType="article"
        alignment="left"
        gridCols={3}
        totalResults={documents.length}
        emptyStateText={formatAuthorMessage(messages.noPublishedArticles, {
          name: author.name,
        })}
      />
    </article>
  );
}
