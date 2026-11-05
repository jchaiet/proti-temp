import { CTA_FRAGMENT } from "./cta";

export const CTA_GROUP_FRAGMENT = `
  items[] {
    ${CTA_FRAGMENT}
  },

  alignment,
  stackOnMobile
`;
