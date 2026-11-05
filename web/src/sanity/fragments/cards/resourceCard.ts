import { IMAGE_FRAGMENT } from "../image";

import { LINK_FRAGMENT } from "../link";

export const RESOURCE_CARD_FRAGMENT = `
  _key,
  _type,

  title,
  summary,

  link {
    ${LINK_FRAGMENT}
  },

  image {
    ${IMAGE_FRAGMENT}
  },

  fileType,
  fileSize,
  tags,
  actionLabel
`;
