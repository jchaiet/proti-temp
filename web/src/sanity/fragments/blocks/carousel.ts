import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import {
  ARTICLE_CARD_FRAGMENT,
  FULL_BLEED_CARD_FRAGMENT,
  RESOURCE_CARD_FRAGMENT,
  TESTIMONIAL_CARD_FRAGMENT,
} from "../cards";

import { CTA_FRAGMENT } from "../cta";
import { CTA_GROUP_FRAGMENT } from "../ctaGroup";
import { IMAGE_FRAGMENT } from "../image";
import { LINK_FRAGMENT } from "../link";
import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const CAROUSEL_BLOCK_FRAGMENT = `
  _type == "carouselBlock" => {
    styles {
      ${BLOCK_STYLES_FRAGMENT}
    },

    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    layout,
    alignment,
    mediaPosition,

    ctaGroup {
      ${CTA_GROUP_FRAGMENT}
    },

    // Legacy fields retained until stored content is migrated.
    ctas[] {
      ${CTA_FRAGMENT}
    },
    ctaAlignment,
    ctaStackOnMobile,

    items[] {
      _key,
      _type,

      _type == "carouselImageItem" => {
        image {
          ${IMAGE_FRAGMENT}
        },

        link {
          ${LINK_FRAGMENT}
        }
      },

      _type == "articleCard" => {
        ${ARTICLE_CARD_FRAGMENT}
      },

      _type == "resourceCard" => {
        ${RESOURCE_CARD_FRAGMENT}
      },

      _type == "testimonialCard" => {
        ${TESTIMONIAL_CARD_FRAGMENT}
      },

      _type == "fullBleedCard" => {
        ${FULL_BLEED_CARD_FRAGMENT}
      }
    },

    itemsPerPage,
    itemsPerRow,

    autoPlay,
    autoPlayInterval,

    mobilePeek,
    grayscaleImages
  }
`;
