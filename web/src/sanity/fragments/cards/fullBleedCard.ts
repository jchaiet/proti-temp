import { IMAGE_FRAGMENT } from "../image";
import { LINK_FRAGMENT } from "../link";

export const FULL_BLEED_CARD_FRAGMENT = `
  _key,
  _type,

  image {
    ${IMAGE_FRAGMENT}
  },

  title,
  description,

  link {
    ${LINK_FRAGMENT}
  },

  expandable
`;
