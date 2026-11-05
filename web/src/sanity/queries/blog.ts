import {
  ACCORDION_BLOCK_FRAGMENT,
  CAROUSEL_BLOCK_FRAGMENT,
  CONTENT_BLOCK_FRAGMENT,
  DOCUMENT_LIST_BLOCK_FRAGMENT,
  FORM_BLOCK_FRAGMENT,
  GRID_BLOCK_FRAGMENT,
  POLL_BLOCK_FRAGMENT,
  RICH_TEXT_BLOCK_FRAGMENT,
  TABS_BLOCK_FRAGMENT,
  SINGLETON_REFERENCE_BLOCK_FRAGMENT,
} from "@/sanity/fragments";

import { IMAGE_FRAGMENT } from "@/sanity/fragments/image";

export const BLOG_BY_SLUG_QUERY = `
  *[
    _type == "blog" &&
    site._ref == $siteId &&
    locale == $locale &&
    slug.current == $slug
  ][0] {
    _id,
    _type,
    _updatedAt,

    "siteId": site._ref,
    locale,

    title,
    summary,
    "showSummaryInArticle": coalesce(showSummaryInArticle, false),

    "slug": slug.current,

    publishedAt,
    lastModifiedAt,
    reviewedAt,

    mainImage {
      ${IMAGE_FRAGMENT}
    },

    "author": author->{
      _id,
      _type,
      _createdAt,
      _updatedAt,
      "siteId": site._ref,
      "defaultLocale": site->defaultLocale,
      "translatedLocales": translations[defined(name) && name != ""].locale,

      "name": coalesce(
        translations[
          locale == $locale
        ][0].name,
        name
      ),

      "jobTitle": coalesce(
        translations[
          locale == $locale
        ][0].jobTitle,
        jobTitle
      ),

      "expertise": coalesce(
        translations[
          locale == $locale
        ][0].expertise,
        expertise
      ),

      credentials[]{
        name,
        category,
        identifier,
        recognizedBy,
        url
      },

      "affiliation": select(
        defined(affiliationName) => {
          "name": affiliationName,
          "url": affiliationUrl
        }
      ),

      "bioPortableText": coalesce(
        translations[
          locale == $locale
        ][0].bioRichText,
        bioRichText
      ),

      "bioLegacy": coalesce(
        translations[
          locale == $locale
        ][0].bio,
        bio
      ),

      "image": {
        "asset": image.asset,
        "crop": image.crop,
        "hotspot": image.hotspot,

        "alt": coalesce(
          translations[
            locale == $locale
          ][0].imageAlt,
          image.alt,
          ""
        )
      },

      "slug": slug.current,

      profileUrl,
      sameAs
    },

    "reviewer": reviewer->{
      _id,
      _type,
      _createdAt,
      _updatedAt,
      "siteId": site._ref,
      "defaultLocale": site->defaultLocale,
      "translatedLocales": translations[defined(name) && name != ""].locale,

      "name": coalesce(
        translations[
          locale == $locale
        ][0].name,
        name
      ),

      "jobTitle": coalesce(
        translations[
          locale == $locale
        ][0].jobTitle,
        jobTitle
      ),

      "expertise": coalesce(
        translations[
          locale == $locale
        ][0].expertise,
        expertise
      ),

      credentials[]{
        name,
        category,
        identifier,
        recognizedBy,
        url
      },

      "affiliation": select(
        defined(affiliationName) => {
          "name": affiliationName,
          "url": affiliationUrl
        }
      ),

      "bioPortableText": coalesce(
        translations[
          locale == $locale
        ][0].bioRichText,
        bioRichText
      ),

      "bioLegacy": coalesce(
        translations[
          locale == $locale
        ][0].bio,
        bio
      ),

      "image": {
        "asset": image.asset,
        "crop": image.crop,
        "hotspot": image.hotspot,

        "alt": coalesce(
          translations[
            locale == $locale
          ][0].imageAlt,
          image.alt,
          ""
        )
      },

      "slug": slug.current,

      profileUrl,
      sameAs
    },

    sources[]{
      title,
      publisher,
      publicationDate,
      url
    },

    taxonomy[]->{
      _id,
      _type,

      "title": coalesce(
        translations[
          locale == $locale
        ][0].title,
        title
      ),

      "description": coalesce(
        translations[
          locale == $locale
        ][0].description,
        description
      ),

      "slug": slug.current,
      "parentId": parent._ref
    },

    seo {
      metaTitle,
      metaDescription,

      socialImage {
        ${IMAGE_FRAGMENT}
      },

      canonicalUrl,

      indexing,
      following
    },

    sections[] {
      _key,
      _type,

      ${CAROUSEL_BLOCK_FRAGMENT},

      ${ACCORDION_BLOCK_FRAGMENT},

      ${CONTENT_BLOCK_FRAGMENT},

      ${TABS_BLOCK_FRAGMENT},

      ${FORM_BLOCK_FRAGMENT},

      ${GRID_BLOCK_FRAGMENT},

      ${DOCUMENT_LIST_BLOCK_FRAGMENT},

      ${RICH_TEXT_BLOCK_FRAGMENT},

      ${POLL_BLOCK_FRAGMENT},

      ${SINGLETON_REFERENCE_BLOCK_FRAGMENT}
    }
  }
`;
