import { LINK_FRAGMENT } from "./link";

export const CTA_FRAGMENT = `
  _key,

  label,
  actionType,

  variant,
  size,
  inverted,

  icon,
  iconAlignment,

  link {
    ${LINK_FRAGMENT}
  },

  modal {
    _ref
  }
`;
