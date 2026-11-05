import { BLOCK_STYLES_FRAGMENT } from "../blockStyles";
import { SECTION_HEADING_FRAGMENT } from "../sectionHeading";

export const RICH_TEXT_BLOCK_FRAGMENT = `
  _type == "richTextBlock" => {
    styles {
      ${BLOCK_STYLES_FRAGMENT}
    },

    heading {
      ${SECTION_HEADING_FRAGMENT}
    },

    content,
    alignment,
    maxWidth
  }
`;
