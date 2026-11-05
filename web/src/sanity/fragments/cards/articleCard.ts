import { IMAGE_FRAGMENT } from "../image";

import { LINK_FRAGMENT } from "../link";

export const ARTICLE_CARD_FRAGMENT = `
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

  category,
  publishedAt,
  readTime,
  orientation,

  author {
    name,
    role,

    avatar {
      ${IMAGE_FRAGMENT}
    }
  }
`;
