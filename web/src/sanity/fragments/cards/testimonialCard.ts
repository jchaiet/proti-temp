import { IMAGE_FRAGMENT } from "../image";

export const TESTIMONIAL_CARD_FRAGMENT = `
  _key,
  _type,

  quote,
  rating,

  author {
    name,
    title,
    company,

    avatar {
      ${IMAGE_FRAGMENT}
    }
  },

  companyLogo {
    ${IMAGE_FRAGMENT}
  }
`;
