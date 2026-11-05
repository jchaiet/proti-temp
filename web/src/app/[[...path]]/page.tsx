import type { Metadata } from "next";
import { draftMode, headers } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { AuthorTemplate } from "@/components/Author/AuthorTemplate";
import { BlogTemplate } from "@/components/Blog/BlogTemplate";
import { BlogTaxonomyTemplate } from "@/components/Blog/BlogTaxonomyTemplate";
import { BlockRenderer } from "@/components/BlockRenderer";
import { SiteLayout } from "@/components/SiteLayout";
import { StructuredData } from "@/components/StructuredData";

import {
  buildAuthorLocaleLinks,
  getAuthorBySlug,
} from "@/cms/resolvers/author";
import { getBlogBySlug } from "@/cms/resolvers/blog";
import {
  buildBlogTaxonomyLocaleLinks,
  getBlogTaxonomyPage,
} from "@/cms/resolvers/blog-taxonomy";
import { appendRedirectSearchParams } from "@/cms/resolvers/redirect";
import {
  getAuthorSlug,
  getBlogSlug,
  getBlogTaxonomySegments,
  resolveRoute,
} from "@/cms/resolvers/route";
import { getPageContentDescription } from "@/cms/resolvers/page-description";
import { buildSeoMetadata } from "@/cms/resolvers/seo";
import { resolveDocumentTranslations } from "@/cms/resolvers/translation";
import {
  buildBlogPostingSchema,
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildOrganizationSchema,
  buildPersonSchema,
  buildProfilePageSchema,
  buildWebPageSchema,
  buildWebSiteSchema,
  getBlogPostingSchemaId,
  getBreadcrumbSchemaId,
  getPersonSchemaId,
  getPrimaryImageSchemaId,
  resolveStructuredDataSite,
  resolveStructuredDataUrl,
} from "@/cms/resolvers/structured-data";
import { buildBreadcrumbItems } from "@/cms/resolvers/structured-data-breadcrumbs";

import { resolveLocale, segmentsToPath } from "@/lib/routing/locale";
import {
  buildLocalePublicPath,
  getLocalePrefix,
} from "@/lib/routing/public-url";
import { resolvePageBySegments } from "@/sanity/queries/page";
import { resolveSiteByHostCached } from "@/sanity/queries/site";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params: Promise<{
    path?: string[];
  }>;

  searchParams: Promise<SearchParams>;
};

function getHomeHref(localePrefix: string): string {
  return localePrefix || "/";
}

function getAuthorProfilePublicPath(
  author:
    | {
        slug?: string;
        availableLocales?: string[];
      }
    | undefined,
  locale: string,
  defaultLocale: string,
): string | undefined {
  if (!author?.slug) {
    return undefined;
  }

  const profileLocale = author.availableLocales?.length
    ? author.availableLocales.includes(locale)
      ? locale
      : defaultLocale
    : locale;

  return buildLocalePublicPath({
    locale: profileLocale,
    defaultLocale,
    path: `/authors/${author.slug}`,
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { path = [] } = await params;

  const requestHeaders = await headers();

  const forwardedHost = requestHeaders.get("x-forwarded-host");

  const hostHeader = requestHeaders.get("host");

  const host = forwardedHost?.split(",")[0]?.trim() ?? hostHeader?.trim();

  if (!host) {
    return {};
  }

  const site = await resolveSiteByHostCached(host);

  if (!site) {
    return {};
  }

  const { locale, pageSegments } = resolveLocale(site, path);

  /*
   * Canonicals always use the public URL form:
   * the default Locale is omitted, while non-default
   * Locales keep their prefix.
   */
  const publicPath = buildLocalePublicPath({
    locale,
    defaultLocale: site.defaultLocale,
    path: segmentsToPath(pageSegments),
  });

  const authorSlug = getAuthorSlug(pageSegments);

  if (authorSlug) {
    const author = await getAuthorBySlug({
      siteId: site._id,
      locale,
      slug: authorSlug,
    });

    if (!author) {
      return {};
    }

    const authorLinks = buildAuthorLocaleLinks({
      slug: author.slug,

      defaultLocale: site.defaultLocale,

      locales: site.locales,

      domains: site.domains,
      canonicalDomain: site.canonicalDomain,
      availableLocales: author.availableLocales,
    });

    const hasLocalizedAuthor =
      author.availableLocales?.includes(locale) ??
      locale === site.defaultLocale;

    return buildSeoMetadata({
      siteId: site._id,
      locale,

      publicPath,

      title: author.name,

      description: author.bio,

      imageUrl: author.socialImageUrl ?? author.imageUrl,

      imageAlt: author.imageAlt,

      type: "website",

      seo: hasLocalizedAuthor
        ? undefined
        : {
            indexing: "noindex",
            following: "follow",
          },

      languageAlternates: authorLinks.languageAlternates,
    });
  }

  /*
   * Taxonomy landing pages do not yet have a dedicated
   * SEO override object, so they use Taxonomy title /
   * description plus Site + Locale SEO defaults.
   */
  const taxonomySegments = getBlogTaxonomySegments(pageSegments);

  if (taxonomySegments) {
    const taxonomyPage = await getBlogTaxonomyPage({
      siteId: site._id,
      locale,
      segments: taxonomySegments,
    });

    if (!taxonomyPage) {
      return {};
    }

    const taxonomyLinks = buildBlogTaxonomyLocaleLinks({
      path: taxonomyPage.taxonomy.path,

      defaultLocale: site.defaultLocale,

      locales: site.locales,

      domains: site.domains,
      canonicalDomain: site.canonicalDomain,
    });

    return buildSeoMetadata({
      siteId: site._id,
      locale,

      publicPath,

      title: taxonomyPage.taxonomy.title,

      description: taxonomyPage.taxonomy.description,

      type: "website",

      languageAlternates: taxonomyLinks.languageAlternates,
    });
  }

  const blogSlug = getBlogSlug(pageSegments);

  if (blogSlug) {
    const blog = await getBlogBySlug({
      siteId: site._id,
      locale,
      slug: blogSlug,
    });

    if (!blog) {
      return {};
    }

    const translations = await resolveDocumentTranslations({
      siteId: site._id,

      documentId: blog._id,

      documentType: "blog",

      defaultLocale: site.defaultLocale,

      domains: site.domains,
      canonicalDomain: site.canonicalDomain,
    });

    return buildSeoMetadata({
      siteId: site._id,
      locale,

      publicPath,

      title: blog.title,

      description: blog.summary,

      imageUrl: blog.socialImageUrl ?? blog.imageUrl,

      imageAlt: blog.imageAlt,

      seo: blog.seo,

      type: "article",

      publishedAt: blog.publishedAt,

      modifiedAt: blog.lastModifiedAt,

      articleAuthorUrls: (() => {
        const authorPath = getAuthorProfilePublicPath(
          blog.author,
          locale,
          site.defaultLocale,
        );

        return authorPath ? [authorPath] : undefined;
      })(),

      articleTags: blog.taxonomy?.map((term) => term.title),

      languageAlternates: translations.languageAlternates,
    });
  }

  const page = await resolvePageBySegments(site._id, locale, pageSegments);

  if (!page) {
    return {};
  }

  const translations = await resolveDocumentTranslations({
    siteId: site._id,

    documentId: page._id,

    documentType: "page",

    defaultLocale: site.defaultLocale,

    domains: site.domains,
    canonicalDomain: site.canonicalDomain,
  });

  return buildSeoMetadata({
    siteId: site._id,
    locale,

    publicPath,

    title: page.title,

    description: getPageContentDescription(page.sections),

    seo: page.seo,

    isHomepage: page.isHomepage,

    type: "website",

    languageAlternates: translations.languageAlternates,
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const [{ path = [] }, requestSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const [{ isEnabled: visualEditing }, requestHeaders] = await Promise.all([
    draftMode(),
    headers(),
  ]);

  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const hostHeader = requestHeaders.get("host");

  const host = forwardedHost?.split(",")[0]?.trim() ?? hostHeader?.trim();

  if (!host) {
    notFound();
  }

  const site = await resolveSiteByHostCached(host);

  if (!site) {
    notFound();
  }

  const { locale, pageSegments, explicitDefaultLocale } = resolveLocale(
    site,
    path,
  );

  /*
   * An explicitly authored default Locale such as /en-us
   * still needs an unprefixed redirect destination.
   */
  const localePrefix = getLocalePrefix(locale, site.defaultLocale);

  const resolvedRoute = await resolveRoute({
    siteId: site._id,
    locale,
    segments: pageSegments,
    localePrefix,
    explicitDefaultLocale,
    visualEditing,
  });

  if (resolvedRoute.type === "redirect") {
    const destination = resolvedRoute.redirect.preserveQuery
      ? appendRedirectSearchParams(
          resolvedRoute.redirect.destination,
          requestSearchParams,
        )
      : resolvedRoute.redirect.destination;

    if (resolvedRoute.redirect.permanent) {
      permanentRedirect(destination);
    }

    redirect(destination);
  }

  if (resolvedRoute.type === "canonicalRedirect") {
    permanentRedirect(
      appendRedirectSearchParams(
        resolvedRoute.destination,
        requestSearchParams,
      ),
    );
  }

  const homeHref = getHomeHref(localePrefix);

  if (resolvedRoute.type === "notFound") {
    notFound();
  }

  const structuredSite = await resolveStructuredDataSite(site._id);

  const globalStructuredData = structuredSite
    ? [
        buildOrganizationSchema(structuredSite),

        buildWebSiteSchema(structuredSite),
      ]
    : [];

  /* Author profile routes inherit Site + Locale default Navigation. */
  if (resolvedRoute.type === "author") {
    const authorPage = resolvedRoute.authorPage;

    const authorLinks = buildAuthorLocaleLinks({
      slug: authorPage.author.slug,

      defaultLocale: site.defaultLocale,

      locales: site.locales,

      domains: site.domains,
      canonicalDomain: site.canonicalDomain,
      availableLocales: authorPage.author.availableLocales,
    });

    const publicPath = buildLocalePublicPath({
      locale,
      defaultLocale: site.defaultLocale,
      path: segmentsToPath(pageSegments),
    });

    const authorUrl = structuredSite
      ? resolveStructuredDataUrl({
          site: structuredSite,

          publicPath,
        })
      : null;

    const authorBreadcrumbs = structuredSite
      ? buildBreadcrumbSchema(
          buildBreadcrumbItems({
            origin: structuredSite.origin,

            localePrefix,

            segments: pageSegments,

            leafTitle: authorPage.author.name,
            leafUrl: authorUrl ?? undefined,
          }),
        )
      : null;

    const authorPersonId =
      structuredSite && authorUrl
        ? getPersonSchemaId(structuredSite, authorPage.author)
        : undefined;

    const authorBreadcrumbId =
      authorUrl && authorBreadcrumbs
        ? getBreadcrumbSchemaId(authorUrl)
        : undefined;

    const authorStructuredData =
      structuredSite && authorUrl && authorPersonId
        ? [
            ...globalStructuredData,

            buildProfilePageSchema({
              site: structuredSite,

              url: authorUrl,

              name: authorPage.author.name,

              description: authorPage.author.bio,

              locale,

              mainEntityId: authorPersonId,

              breadcrumbId: authorBreadcrumbId,

              dateCreated: authorPage.author._createdAt,

              dateModified: authorPage.author._updatedAt,

              hasPart: authorPage.articles.map((article) => ({
                headline: article.title,

                url: new URL(
                  buildLocalePublicPath({
                    locale,
                    defaultLocale: site.defaultLocale,
                    path: `/blog/${article.slug}`,
                  }),
                  `${structuredSite.origin}/`,
                ).toString(),

                publishedAt: article.publishedAt,
              })),
            }),

            buildPersonSchema({
              site: structuredSite,

              author: authorPage.author,

              url: authorUrl,
            }),

            ...(authorBreadcrumbs ? [authorBreadcrumbs] : []),
          ]
        : [];

    return (
      <SiteLayout
        siteId={site._id}
        locale={locale}
        homeHref={homeHref}
        visualEditing={visualEditing}
        localeHrefs={authorLinks.localeHrefs}
      >
        {!visualEditing && authorStructuredData.length > 0 ? (
          <StructuredData data={authorStructuredData} />
        ) : null}

        <main>
          <AuthorTemplate page={authorPage} localePrefix={localePrefix} />
        </main>
      </SiteLayout>
    );
  }

  /* Blog taxonomy routes inherit Site + Locale default Navigation. */
  if (resolvedRoute.type === "taxonomy") {
    const taxonomyPage = resolvedRoute.taxonomyPage;

    const taxonomyLinks = buildBlogTaxonomyLocaleLinks({
      path: taxonomyPage.taxonomy.path,

      defaultLocale: site.defaultLocale,

      locales: site.locales,

      domains: site.domains,
      canonicalDomain: site.canonicalDomain,
    });

    const publicPath = buildLocalePublicPath({
      locale,
      defaultLocale: site.defaultLocale,
      path: segmentsToPath(pageSegments),
    });

    const taxonomyUrl = structuredSite
      ? resolveStructuredDataUrl({
          site: structuredSite,

          publicPath,
        })
      : null;

    const taxonomyBreadcrumbs = structuredSite
      ? buildBreadcrumbSchema(
          buildBreadcrumbItems({
            origin: structuredSite.origin,

            localePrefix,

            segments: pageSegments,

            leafTitle: taxonomyPage.taxonomy.title,
            leafUrl: taxonomyUrl ?? undefined,
          }),
        )
      : null;

    const taxonomyBreadcrumbId =
      taxonomyUrl && taxonomyBreadcrumbs
        ? getBreadcrumbSchemaId(taxonomyUrl)
        : undefined;

    const taxonomyStructuredData =
      structuredSite && taxonomyUrl
        ? [
            ...globalStructuredData,

            buildCollectionPageSchema({
              site: structuredSite,

              url: taxonomyUrl,

              name: taxonomyPage.taxonomy.title,

              description: taxonomyPage.taxonomy.description,

              locale,

              breadcrumbId: taxonomyBreadcrumbId,

              items: taxonomyPage.blogs.map((blog) => ({
                name: blog.title,

                url: new URL(
                  buildLocalePublicPath({
                    locale,
                    defaultLocale: site.defaultLocale,
                    path: `/blog/${blog.slug}`,
                  }),
                  `${structuredSite.origin}/`,
                ).toString(),
              })),
            }),

            ...(taxonomyBreadcrumbs ? [taxonomyBreadcrumbs] : []),
          ]
        : [];

    return (
      <SiteLayout
        siteId={site._id}
        locale={locale}
        homeHref={homeHref}
        visualEditing={visualEditing}
        localeHrefs={taxonomyLinks.localeHrefs}
      >
        {!visualEditing && taxonomyStructuredData.length > 0 ? (
          <StructuredData data={taxonomyStructuredData} />
        ) : null}

        <main>
          <BlogTaxonomyTemplate
            page={taxonomyPage}
            localePrefix={localePrefix}
          />
        </main>
      </SiteLayout>
    );
  }

  /* Blog detail routes inherit Site + Locale default Navigation. */
  if (resolvedRoute.type === "blog") {
    const blog = resolvedRoute.blog;

    const translations = await resolveDocumentTranslations({
      siteId: site._id,

      documentId: blog._id,

      documentType: "blog",

      defaultLocale: site.defaultLocale,

      domains: site.domains,
      canonicalDomain: site.canonicalDomain,
    });

    const publicPath = buildLocalePublicPath({
      locale,
      defaultLocale: site.defaultLocale,
      path: segmentsToPath(pageSegments),
    });

    const blogUrl = structuredSite
      ? resolveStructuredDataUrl({
          site: structuredSite,

          publicPath,

          canonicalUrl: blog.seo?.canonicalUrl,
        })
      : null;

    const blogBreadcrumbs = structuredSite
      ? buildBreadcrumbSchema(
          buildBreadcrumbItems({
            origin: structuredSite.origin,

            localePrefix,

            segments: pageSegments,

            leafTitle: blog.title,
            leafUrl: blogUrl ?? undefined,
          }),
        )
      : null;

    const blogAuthorPath = getAuthorProfilePublicPath(
      blog.author,
      locale,
      site.defaultLocale,
    );

    const blogAuthorUrl =
      structuredSite && blogAuthorPath
        ? resolveStructuredDataUrl({
            site: structuredSite,
            publicPath: blogAuthorPath,
          })
        : undefined;

    const blogReviewerPath = getAuthorProfilePublicPath(
      blog.reviewer,
      locale,
      site.defaultLocale,
    );

    const blogReviewerUrl =
      structuredSite && blogReviewerPath
        ? resolveStructuredDataUrl({
            site: structuredSite,
            publicPath: blogReviewerPath,
          })
        : undefined;

    const blogPostingId = blogUrl ? getBlogPostingSchemaId(blogUrl) : undefined;

    const blogBreadcrumbId =
      blogUrl && blogBreadcrumbs ? getBreadcrumbSchemaId(blogUrl) : undefined;

    const blogImageUrl =
      blog.seo?.socialImageUrl ?? blog.socialImageUrl ?? blog.imageUrl;

    const blogPrimaryImageId =
      blogUrl && blogImageUrl ? getPrimaryImageSchemaId(blogUrl) : undefined;

    const blogStructuredData =
      structuredSite && blogUrl
        ? [
            ...globalStructuredData,

            buildWebPageSchema({
              site: structuredSite,

              url: blogUrl,

              name: blog.seo?.metaTitle ?? blog.title,

              description: blog.seo?.metaDescription ?? blog.summary,

              locale,

              mainEntityId: blogPostingId,

              breadcrumbId: blogBreadcrumbId,

              primaryImageId: blogPrimaryImageId,

              reviewedBy: blog.reviewer,

              reviewedByUrl: blogReviewerUrl,

              lastReviewed: blog.reviewedAt,
            }),

            ...(blog.author
              ? [
                  buildPersonSchema({
                    site: structuredSite,

                    author: blog.author,

                    url: blogAuthorUrl,
                  }),
                ]
              : []),

            ...(blog.reviewer
              ? [
                  buildPersonSchema({
                    site: structuredSite,

                    author: blog.reviewer,

                    url: blogReviewerUrl,
                  }),
                ]
              : []),

            buildBlogPostingSchema({
              site: structuredSite,

              url: blogUrl,

              headline: blog.seo?.metaTitle ?? blog.title,

              description: blog.seo?.metaDescription ?? blog.summary,

              locale,

              imageUrl: blogImageUrl,

              publishedAt: blog.publishedAt,

              modifiedAt: blog.lastModifiedAt,

              author: blog.author,

              authorUrl: blogAuthorUrl,

              citations: blog.sources,

              keywords: blog.taxonomy?.map((term) => term.title),

              topics: blog.taxonomy?.map((term) => term.title),
            }),

            ...(blogBreadcrumbs ? [blogBreadcrumbs] : []),
          ]
        : [];

    return (
      <SiteLayout
        siteId={site._id}
        locale={locale}
        homeHref={homeHref}
        visualEditing={visualEditing}
        localeHrefs={translations.localeHrefs}
      >
        {!visualEditing && blogStructuredData.length > 0 ? (
          <StructuredData data={blogStructuredData} />
        ) : null}

        <main>
          <BlogTemplate
            blog={blog}
            localePrefix={localePrefix}
            visualEditing={visualEditing}
          />
        </main>
      </SiteLayout>
    );
  }

  /* Normal Page Builder page resolution. */
  const page = resolvedRoute.type === "page" ? resolvedRoute.page : notFound();

  const translations = await resolveDocumentTranslations({
    siteId: site._id,

    documentId: page._id,

    documentType: "page",

    defaultLocale: site.defaultLocale,

    domains: site.domains,
    canonicalDomain: site.canonicalDomain,
  });

  const publicPath = buildLocalePublicPath({
    locale,
    defaultLocale: site.defaultLocale,
    path: segmentsToPath(pageSegments),
  });

  const pageUrl = structuredSite
    ? resolveStructuredDataUrl({
        site: structuredSite,

        publicPath,

        canonicalUrl: page.seo?.canonicalUrl,
      })
    : null;

  const pageBreadcrumbs = structuredSite
    ? buildBreadcrumbSchema(
        buildBreadcrumbItems({
          origin: structuredSite.origin,

          localePrefix,

          segments: pageSegments,

          leafTitle: page.title,
          leafUrl: pageUrl ?? undefined,
        }),
      )
    : null;

  const pageBreadcrumbId =
    pageUrl && pageBreadcrumbs ? getBreadcrumbSchemaId(pageUrl) : undefined;

  const pageStructuredData =
    structuredSite && pageUrl
      ? [
          ...globalStructuredData,

          buildWebPageSchema({
            site: structuredSite,

            url: pageUrl,

            name: page.seo?.metaTitle ?? page.title,

            description: page.seo?.metaDescription,

            locale,

            breadcrumbId: pageBreadcrumbId,
          }),

          ...(pageBreadcrumbs ? [pageBreadcrumbs] : []),
        ]
      : [];

  return (
    <SiteLayout
      siteId={site._id}
      locale={locale}
      navigationOverride={page.navigation}
      homeHref={homeHref}
      visualEditing={visualEditing}
      localeHrefs={translations.localeHrefs}
    >
      {!visualEditing && pageStructuredData.length > 0 ? (
        <StructuredData data={pageStructuredData} />
      ) : null}

      <main>
        <BlockRenderer
          blocks={page.sections}
          context={{
            siteId: site._id,
            locale,
            localePrefix,
            visualEditing,
            searchParams: requestSearchParams,
          }}
        />
      </main>
    </SiteLayout>
  );
}
