import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import { CTA_FRAGMENT } from "../cta";
import { CTA_GROUP_FRAGMENT } from "../ctaGroup";
import { IMAGE_FRAGMENT } from "../image";
import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const TABS_BLOCK_FRAGMENT = `
  _type == "tabsBlock" => {
    styles {
      ${BLOCK_STYLES_FRAGMENT}
    },

    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    alignment,

    items[] {
      _key,
      _type,

      label,
      badge,
      defaultActive,

      content,

      mediaType,

      image {
        ${IMAGE_FRAGMENT}
      },

      videoUrl,

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
  }
`;
