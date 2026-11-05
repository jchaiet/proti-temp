import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import {
  ARTICLE_CARD_FRAGMENT,
  RESOURCE_CARD_FRAGMENT,
  TESTIMONIAL_CARD_FRAGMENT,
} from "../cards";

import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const DOCUMENT_LIST_BLOCK_FRAGMENT = `
  _type == "documentListBlock" => {
    styles {
      ${BLOCK_STYLES_FRAGMENT}
    },

    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    sourceMode,

    documents[] {
      _key,
      _type,

      _type == "resourceCard" => {
        ${RESOURCE_CARD_FRAGMENT}
      },

      _type == "articleCard" => {
        ${ARTICLE_CARD_FRAGMENT}
      },

      _type == "testimonialCard" => {
        ${TESTIMONIAL_CARD_FRAGMENT}
      }
    },

    dynamicContentTypes,

    "dynamicTaxonomy": dynamicTaxonomy[] {
      _key,
      _type,
      _ref,

      "_id": @->_id,

      "title": coalesce(
        @->translations[
          locale == $locale
        ][0].title,
        @->title
      ),

      "slug": @->slug.current,

      "kind": coalesce(@->kind, "term"),
      "includeInFilters": @->includeInFilters
    },

    dynamicTaxonomyMatchLogic,

    dynamicSort,
    dynamicLimit,

    alignment,
    gridCols,

    enableSearch,
    searchPlaceholder,
    requireSearchQuery,
    initialStateText,

    enableFilters,
    filterTitle,
    filterLogic,

    filterOptions[] {
      _key,
      label,
      value
    },

    taxonomyFilterGroups[] {
      _key,
      title,
      logic,
      matchLogic,

      "taxonomy": taxonomy[] {
        _key,
        _type,
        _ref,

        "_id": @->_id,

        "title": coalesce(
          @->translations[
            locale == $locale
          ][0].title,
          @->title
        ),

        "slug": @->slug.current,

        "kind": coalesce(@->kind, "term"),
        "includeInFilters": @->includeInFilters
      }
    },

    taxonomyFilterTitle,
    taxonomyFilterLogic,
    taxonomyFilterMatchLogic,

    "filterTaxonomy": filterTaxonomy[] {
      _key,
      _type,
      _ref,

      "_id": @->_id,

      "title": coalesce(
        @->translations[
          locale == $locale
        ][0].title,
        @->title
      ),

      "slug": @->slug.current,

      "kind": coalesce(@->kind, "term"),
      "includeInFilters": @->includeInFilters
    },

    enableSorting,

    standardSortOptions,

    customSortOptions[] {
      _key,
      label,
      field,
      direction
    },

    sortOptions[] {
      _key,
      label,
      value
    },

    enablePagination,
    itemsPerPage,

    emptyStateText
  }
`;
