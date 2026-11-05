import type { CmsImage } from "@/cms/types";
import type { BreadcrumbItem, JsonLdObject } from "@/cms/types/structured-data";

import { resolveSanityImagePreset } from "@/cms/resolvers/image";

import {
  getSiteOrigin,
  resolveCanonicalPublicUrl,
} from "@/lib/routing/public-url";

import { siteLocaleToLanguageTag } from "@/lib/routing/locale";

import { PUBLISHED_SANITY_FETCH_OPTIONS } from "@/sanity/cache";
import { sanityClient } from "@/sanity/client";

export interface StructuredDataOrganizationAddress {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

export interface StructuredDataOrganizationContactPoint {
  contactType?: string;
  telephone?: string;
  email?: string;
  url?: string;
  areaServed?: string[];
  availableLanguages?: string[];
}

export interface StructuredDataOrganization {
  name?: string;
  legalName?: string;
  description?: string;

  logoUrl?: string;
  logoAlt?: string;

  sameAs?: string[];

  contactPoints?: StructuredDataOrganizationContactPoint[];

  address?: StructuredDataOrganizationAddress;
}

export interface StructuredDataSite {
  name: string;
  origin: string;

  locales?: string[];

  organization?: StructuredDataOrganization;
}

export interface StructuredDataAuthorCredential {
  name: string;
  category?: string;
  identifier?: string;
  recognizedBy?: string;
  url?: string;
}

export interface StructuredDataAuthorAffiliation {
  name: string;
  url?: string;
}

export interface StructuredDataAuthor {
  _id: string;

  name: string;
  slug?: string;

  bio?: string;
  jobTitle?: string;

  expertise?: string[];
  credentials?: StructuredDataAuthorCredential[];
  affiliation?: StructuredDataAuthorAffiliation;

  profileUrl?: string;

  imageUrl?: string;
  imageAlt?: string;

  sameAs?: string[];
}

export interface StructuredDataCitation {
  title: string;
  publisher?: string;
  publicationDate?: string;
  url?: string;
}

type StructuredDataOrganizationRecord = Omit<
  StructuredDataOrganization,
  "logoUrl" | "logoAlt"
> & {
  logo?: CmsImage;
};

type StructuredDataSiteRecord = {
  name?: string;
  domains?: string[];
  canonicalDomain?: string;

  locales?: Array<{
    code?: string;
  }>;

  organization?: StructuredDataOrganizationRecord;
};

export interface WebPageStructuredDataOptions {
  site: StructuredDataSite;

  url: string;

  name: string;

  description?: string;

  locale: string;

  mainEntityId?: string;
  breadcrumbId?: string;
  primaryImageId?: string;

  reviewedBy?: StructuredDataAuthor;
  reviewedByUrl?: string;
  lastReviewed?: string;
}

export interface ProfilePageStructuredDataOptions {
  site: StructuredDataSite;

  url: string;

  name: string;

  description?: string;

  locale: string;

  mainEntityId: string;
  breadcrumbId?: string;

  dateCreated?: string;
  dateModified?: string;

  hasPart?: Array<{
    headline: string;
    url: string;
    publishedAt?: string;
  }>;
}

export interface BlogPostingStructuredDataOptions {
  site: StructuredDataSite;

  url: string;

  headline: string;

  description?: string;

  locale: string;

  imageUrl?: string;

  publishedAt?: string;

  modifiedAt?: string;

  author?: StructuredDataAuthor;
  authorUrl?: string;

  citations?: StructuredDataCitation[];

  keywords?: string[];
  topics?: string[];
}

export interface CollectionPageStructuredDataOptions {
  site: StructuredDataSite;

  url: string;

  name: string;

  description?: string;

  locale: string;

  breadcrumbId?: string;

  items?: Array<{
    name: string;
    url: string;
  }>;
}

function compactObject(value: JsonLdObject): JsonLdObject {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== undefined && item !== null && item !== "",
    ),
  ) as JsonLdObject;
}

function compactStringArray(values?: string[]): string[] | undefined {
  const cleaned = (values ?? [])
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return cleaned.length > 0 ? cleaned : undefined;
}

function uniqueStringArray(values?: string[]): string[] | undefined {
  const cleaned = compactStringArray(values);

  if (!cleaned) {
    return undefined;
  }

  return Array.from(new Set(cleaned));
}

function buildImageObject({
  id,
  url,
  caption,
}: {
  id: string;
  url?: string;
  caption?: string;
}): JsonLdObject | null {
  const imageUrl = url?.trim();

  if (!imageUrl) {
    return null;
  }

  return compactObject({
    "@type": "ImageObject",
    "@id": id,

    url: imageUrl,
    contentUrl: imageUrl,

    caption: caption?.trim() || null,
  });
}

function normalizeSchemaDate(value?: string): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const timestamp = Date.parse(trimmed);

  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeSchemaDateTime(value?: string): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const timestamp = Date.parse(trimmed);

  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

function buildPostalAddress(
  address: StructuredDataOrganizationAddress | undefined,
): JsonLdObject | null {
  if (!address) {
    return null;
  }

  const value = compactObject({
    "@type": "PostalAddress",

    streetAddress: address.streetAddress?.trim() || null,

    addressLocality: address.addressLocality?.trim() || null,

    addressRegion: address.addressRegion?.trim() || null,

    postalCode: address.postalCode?.trim() || null,

    addressCountry: address.addressCountry?.trim().toUpperCase() || null,
  });

  return Object.keys(value).length > 1 ? value : null;
}

function buildContactPoint(
  contact: StructuredDataOrganizationContactPoint,
): JsonLdObject | null {
  const telephone = contact.telephone?.trim() || undefined;

  const email = contact.email?.trim() || undefined;

  const url = contact.url?.trim() || undefined;

  /*
   * Studio validation already requires at least one real
   * contact method. Keep the frontend defensive in case
   * stale/imported content bypasses validation.
   */
  if (!telephone && !email && !url) {
    return null;
  }

  return compactObject({
    "@type": "ContactPoint",

    contactType: contact.contactType?.trim() || null,

    telephone: telephone ?? null,

    email: email ?? null,

    url: url ?? null,

    areaServed: compactStringArray(contact.areaServed) ?? null,

    availableLanguage: compactStringArray(contact.availableLanguages) ?? null,
  });
}

export async function resolveStructuredDataSite(
  siteId: string,
): Promise<StructuredDataSite | null> {
  if (!siteId) {
    return null;
  }

  const site = await sanityClient.fetch<StructuredDataSiteRecord | null>(
    `
        *[
          _type == "site" &&
          _id == $siteId
        ][0]{
          name,
          domains,
          canonicalDomain,

          locales[] {
            code
          },

          organization {
            name,
            legalName,
            description,

            logo {
              asset {
                _ref,
                _type
              },

              crop {
                _type,
                top,
                bottom,
                left,
                right
              },

              hotspot {
                _type,
                x,
                y,
                height,
                width
              },

              alt
            },

            sameAs,

            contactPoints[] {
              contactType,
              telephone,
              email,
              url,
              areaServed,
              availableLanguages
            },

            address {
              streetAddress,
              addressLocality,
              addressRegion,
              postalCode,
              addressCountry
            }
          }
        }
      `,
    {
      siteId,
    },
    PUBLISHED_SANITY_FETCH_OPTIONS,
  );

  if (!site) {
    return null;
  }

  const origin = getSiteOrigin(site.domains, site.canonicalDomain);

  if (!origin) {
    return null;
  }

  const organization = site.organization
    ? {
        ...site.organization,

        logoUrl: resolveSanityImagePreset(site.organization.logo, "logo"),

        logoAlt: site.organization.logo?.alt ?? "",
      }
    : undefined;

  return {
    name: site.name?.trim() || "Website",

    origin,

    locales: uniqueStringArray(
      site.locales?.map((locale) => locale.code ?? ""),
    ),

    organization,
  };
}

export function resolveStructuredDataUrl({
  site,
  publicPath,
  canonicalUrl,
}: {
  site: StructuredDataSite;
  publicPath: string;
  canonicalUrl?: string;
}): string {
  return (
    resolveCanonicalPublicUrl({
      origin: site.origin,
      publicPath,
      canonicalUrl,
    }).canonical ?? site.origin
  );
}

export function getOrganizationSchemaId(site: StructuredDataSite): string {
  return `${site.origin}/#organization`;
}

export function getWebSiteSchemaId(site: StructuredDataSite): string {
  return `${site.origin}/#website`;
}

export function getWebPageSchemaId(url: string): string {
  return `${url}#webpage`;
}

export function getBlogPostingSchemaId(url: string): string {
  return `${url}#blogposting`;
}

export function getCollectionPageSchemaId(url: string): string {
  return `${url}#collectionpage`;
}

export function getItemListSchemaId(url: string): string {
  return `${url}#itemlist`;
}

export function getBreadcrumbSchemaId(url: string): string {
  return `${url}#breadcrumb`;
}

export function getPrimaryImageSchemaId(url: string): string {
  return `${url}#primaryimage`;
}

function getAuthorKey(author: StructuredDataAuthor): string {
  const raw = author.slug?.trim() || author._id.replace(/^drafts\./, "").trim();

  return encodeURIComponent(raw || "author");
}

export function getPersonSchemaId(
  site: StructuredDataSite,
  author: StructuredDataAuthor,
): string {
  return `${site.origin}/#person-${getAuthorKey(author)}`;
}

function buildCredentialSchema(
  credential: StructuredDataAuthorCredential,
): JsonLdObject | null {
  const name = credential.name?.trim();

  if (!name) {
    return null;
  }

  const recognizedBy = credential.recognizedBy?.trim();

  return compactObject({
    "@type": "EducationalOccupationalCredential",

    name,

    credentialCategory: credential.category?.trim() || null,

    identifier: credential.identifier?.trim() || null,

    url: credential.url?.trim() || null,

    recognizedBy: recognizedBy
      ? {
          "@type": "Organization",
          name: recognizedBy,
        }
      : null,
  });
}

function buildCitationSchema(
  citation: StructuredDataCitation,
): JsonLdObject | null {
  const name = citation.title?.trim();

  if (!name) {
    return null;
  }

  const publisher = citation.publisher?.trim();

  return compactObject({
    "@type": "CreativeWork",

    name,

    url: citation.url?.trim() || null,

    datePublished: citation.publicationDate?.trim() || null,

    publisher: publisher
      ? {
          "@type": "Organization",
          name: publisher,
        }
      : null,
  });
}

export function buildPersonSchema({
  site,
  author,
  url,
}: {
  site: StructuredDataSite;
  author: StructuredDataAuthor;
  url?: string;
}): JsonLdObject {
  const pageUrl = url?.trim() || undefined;

  const profileUrl = author.profileUrl?.trim() || undefined;

  const sameAs = uniqueStringArray([
    ...(author.sameAs ?? []),

    ...(pageUrl && profileUrl && profileUrl !== pageUrl ? [profileUrl] : []),
  ]);

  const personId = getPersonSchemaId(site, author);

  const image = buildImageObject({
    id: `${personId}-image`,
    url: author.imageUrl,
    caption: author.imageAlt,
  });

  const credentials = (author.credentials ?? [])
    .map(buildCredentialSchema)
    .filter((value): value is JsonLdObject => value !== null);

  return compactObject({
    "@type": "Person",

    "@id": personId,

    name: author.name,

    description: author.bio?.trim() || null,

    jobTitle: author.jobTitle?.trim() || null,

    knowsAbout: uniqueStringArray(author.expertise) ?? null,

    hasCredential: credentials.length > 0 ? credentials : null,

    affiliation: author.affiliation?.name?.trim()
      ? compactObject({
          "@type": "Organization",
          name: author.affiliation.name.trim(),
          url: author.affiliation.url?.trim() || null,
        })
      : null,

    url: pageUrl ?? profileUrl ?? null,

    image: image ?? null,

    sameAs: sameAs ?? null,

    mainEntityOfPage: pageUrl
      ? {
          "@id": getWebPageSchemaId(pageUrl),
        }
      : null,
  });
}

export function buildOrganizationSchema(
  site: StructuredDataSite,
): JsonLdObject {
  const organization = site.organization;

  const name = organization?.name?.trim() || site.name;

  const legalName = organization?.legalName?.trim() || undefined;

  const description = organization?.description?.trim() || undefined;

  const organizationId = getOrganizationSchemaId(site);

  const logo = buildImageObject({
    id: `${organizationId}-logo`,
    url: organization?.logoUrl,
    caption: organization?.logoAlt,
  });

  const sameAs = compactStringArray(organization?.sameAs);

  const contactPoint = (organization?.contactPoints ?? [])
    .map(buildContactPoint)
    .filter((value): value is JsonLdObject => value !== null);

  const address = buildPostalAddress(organization?.address);

  return compactObject({
    "@type": "Organization",

    "@id": organizationId,

    name,

    legalName: legalName ?? null,

    description: description ?? null,

    url: site.origin,

    logo: logo ?? null,

    sameAs: sameAs ?? null,

    contactPoint: contactPoint.length > 0 ? contactPoint : null,

    address: address ?? null,
  });
}

export function buildWebSiteSchema(site: StructuredDataSite): JsonLdObject {
  return compactObject({
    "@type": "WebSite",

    "@id": getWebSiteSchemaId(site),

    url: site.origin,

    name: site.name,

    inLanguage:
      uniqueStringArray(site.locales)?.map(siteLocaleToLanguageTag) ?? null,

    publisher: {
      "@id": getOrganizationSchemaId(site),
    },
  });
}

export function buildWebPageSchema({
  site,
  url,
  name,
  description,
  locale,
  mainEntityId,
  breadcrumbId,
  primaryImageId,
  reviewedBy,
  reviewedByUrl,
  lastReviewed,
}: WebPageStructuredDataOptions): JsonLdObject {
  return compactObject({
    "@type": "WebPage",

    "@id": getWebPageSchemaId(url),

    url,

    name,

    description: description ?? null,

    inLanguage: siteLocaleToLanguageTag(locale),

    isPartOf: {
      "@id": getWebSiteSchemaId(site),
    },

    publisher: {
      "@id": getOrganizationSchemaId(site),
    },

    reviewedBy: reviewedBy
      ? compactObject({
          "@type": "Person",
          "@id": getPersonSchemaId(site, reviewedBy),
          name: reviewedBy.name,
          url: reviewedByUrl?.trim() || null,
        })
      : null,

    lastReviewed: normalizeSchemaDate(lastReviewed) ?? null,

    mainEntity: mainEntityId
      ? {
          "@id": mainEntityId,
        }
      : null,

    breadcrumb: breadcrumbId
      ? {
          "@id": breadcrumbId,
        }
      : null,

    primaryImageOfPage: primaryImageId
      ? {
          "@id": primaryImageId,
        }
      : null,
  });
}

export function buildProfilePageSchema({
  site,
  url,
  name,
  description,
  locale,
  mainEntityId,
  breadcrumbId,
  dateCreated,
  dateModified,
  hasPart = [],
}: ProfilePageStructuredDataOptions): JsonLdObject {
  const authoredContent = hasPart
    .filter((item) => item.headline.trim() && item.url.trim())
    .map((item) =>
      compactObject({
        "@type": "BlogPosting",
        "@id": getBlogPostingSchemaId(item.url),
        url: item.url,
        headline: item.headline,
        datePublished: normalizeSchemaDateTime(item.publishedAt) ?? null,
        author: {
          "@id": mainEntityId,
        },
      }),
    );
  return compactObject({
    "@type": "ProfilePage",

    /*
     * ProfilePage is a WebPage subtype. Keep the same #webpage ID used by
     * Person.mainEntityOfPage so the graph describes one page entity rather
     * than two competing page nodes.
     */
    "@id": getWebPageSchemaId(url),

    url,

    name,

    description: description ?? null,

    inLanguage: siteLocaleToLanguageTag(locale),

    dateCreated: normalizeSchemaDateTime(dateCreated) ?? null,

    dateModified: normalizeSchemaDateTime(dateModified) ?? null,

    isPartOf: {
      "@id": getWebSiteSchemaId(site),
    },

    publisher: {
      "@id": getOrganizationSchemaId(site),
    },

    mainEntity: {
      "@id": mainEntityId,
    },

    breadcrumb: breadcrumbId
      ? {
          "@id": breadcrumbId,
        }
      : null,

    hasPart: authoredContent.length > 0 ? authoredContent : null,
  });
}

export function buildBlogPostingSchema({
  site,
  url,
  headline,
  description,
  locale,
  imageUrl,
  publishedAt,
  modifiedAt,
  author,
  authorUrl,
  citations,
  keywords,
  topics,
}: BlogPostingStructuredDataOptions): JsonLdObject {
  const topicNames = uniqueStringArray(topics);

  const image = buildImageObject({
    id: getPrimaryImageSchemaId(url),
    url: imageUrl,
  });

  const citationSchemas = (citations ?? [])
    .map(buildCitationSchema)
    .filter((value): value is JsonLdObject => value !== null);

  return compactObject({
    "@type": "BlogPosting",

    "@id": getBlogPostingSchemaId(url),

    url,

    headline,

    description: description ?? null,

    inLanguage: siteLocaleToLanguageTag(locale),

    image: image ?? null,

    datePublished: publishedAt ?? null,

    dateModified: modifiedAt ?? publishedAt ?? null,

    keywords: uniqueStringArray(keywords) ?? null,

    articleSection: topicNames ?? null,

    about: topicNames
      ? topicNames.map((name) => ({
          "@type": "Thing",
          name,
        }))
      : null,

    citation: citationSchemas.length > 0 ? citationSchemas : null,

    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getWebPageSchemaId(url),
    },

    isPartOf: {
      "@id": getWebSiteSchemaId(site),
    },

    author: author
      ? compactObject({
          "@type": "Person",
          "@id": getPersonSchemaId(site, author),
          name: author.name,
          url: authorUrl?.trim() || null,
        })
      : null,

    publisher: {
      "@id": getOrganizationSchemaId(site),
    },
  });
}

export function buildCollectionPageSchema({
  site,
  url,
  name,
  description,
  locale,
  breadcrumbId,
  items = [],
}: CollectionPageStructuredDataOptions): JsonLdObject {
  const listItems = items
    .filter((item) => item.name.trim() && item.url.trim())
    .map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,

      item: {
        "@type": "BlogPosting",
        "@id": getBlogPostingSchemaId(item.url),
        url: item.url,
        headline: item.name,
      },
    }));

  return compactObject({
    "@type": "CollectionPage",

    "@id": getCollectionPageSchemaId(url),

    url,

    name,

    description: description ?? null,

    inLanguage: siteLocaleToLanguageTag(locale),

    isPartOf: {
      "@id": getWebSiteSchemaId(site),
    },

    publisher: {
      "@id": getOrganizationSchemaId(site),
    },

    about: {
      "@type": "Thing",
      name,
    },

    breadcrumb: breadcrumbId
      ? {
          "@id": breadcrumbId,
        }
      : null,

    mainEntity:
      listItems.length > 0
        ? {
            "@type": "ItemList",
            "@id": getItemListSchemaId(url),
            itemListElement: listItems,
          }
        : null,
  });
}

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
): JsonLdObject | null {
  if (items.length < 2) {
    return null;
  }

  const leaf = items[items.length - 1];

  return {
    "@type": "BreadcrumbList",

    "@id": getBreadcrumbSchemaId(leaf.url),

    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",

      position: index + 1,

      name: item.name,

      item: item.url,
    })),
  };
}
