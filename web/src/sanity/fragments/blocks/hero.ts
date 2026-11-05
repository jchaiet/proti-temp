import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import { CTA_FRAGMENT } from "../cta";
import { CTA_GROUP_FRAGMENT } from "../ctaGroup";
import { IMAGE_FRAGMENT } from "../image";
import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const HERO_BLOCK_FRAGMENT = `
  _type == "heroBlock" => {
    styles {
      ${BLOCK_STYLES_FRAGMENT}
    },

    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    layout,
    hAlignment,
    vAlignment,

    mediaType,

    image {
      ${IMAGE_FRAGMENT}
    },

    videoUrl,

    defaultMediaPosition,
    splitMediaPosition,

    ctaGroup {
      ${CTA_GROUP_FRAGMENT}
    },

    // Legacy fields retained until stored content is migrated.
    ctas[] {
      ${CTA_FRAGMENT}
    },
    ctaAlignment,
    ctaStackOnMobile
  }
`;
