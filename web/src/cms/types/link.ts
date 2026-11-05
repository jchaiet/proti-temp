export type CmsReference = {
  _ref: string;
};

export type CmsLink = {
  type: "none" | "internal" | "external" | "email" | "phone" | "anchor";

  internalPage?: CmsReference;

  externalUrl?: string;

  email?: string;

  phone?: string;

  anchor?: string;

  openInNewTab?: boolean;
};
