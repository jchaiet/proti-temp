import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import {
  ARTICLE_CARD_FRAGMENT,
  FULL_BLEED_CARD_FRAGMENT,
  RESOURCE_CARD_FRAGMENT,
  TESTIMONIAL_CARD_FRAGMENT,
} from "../cards";

import { IMAGE_FRAGMENT } from "../image";
import { LINK_FRAGMENT } from "../link";
import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const GRID_BLOCK_FRAGMENT = `
  _type == "gridBlock" => {
    styles {
      ${BLOCK_STYLES_FRAGMENT}
    },

    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    blockLayout,
    alignment,
    gridPosition,

    cols,

    items[] {
      _key,
      _type,

      _type == "gridImageItem" => {
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

    grayscaleImages,

    sideImage {
      ${IMAGE_FRAGMENT}
    }
  }
`;
