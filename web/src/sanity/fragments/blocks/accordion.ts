import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import { CTA_FRAGMENT } from "../cta";
import { CTA_GROUP_FRAGMENT } from "../ctaGroup";
import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const ACCORDION_BLOCK_FRAGMENT = `
  _type == "accordionBlock" => {
    styles {
      ${BLOCK_STYLES_FRAGMENT}
    },

    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    layout,
    alignment,
    accordionPosition,

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

      title,
      content,
      defaultOpen
    },

    multiple
  }
`;
