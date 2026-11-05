export type CmsRedirectType = "permanent" | "temporary";

export type CmsRedirectDestinationType = "internal" | "path" | "external";

export type CmsRedirectDestination = {
  type: CmsRedirectDestinationType;

  internalPageId?: string;
  path?: string;
  externalUrl?: string;
};

export type CmsRedirect = {
  _id: string;

  sourcePath: string;

  redirectType: CmsRedirectType;

  preserveQuery?: boolean;
  enabled?: boolean;

  destination: CmsRedirectDestination;
};

export type ResolvedRedirect = {
  destination: string;
  permanent: boolean;
  preserveQuery: boolean;
};
