import type { CmsImage } from "../image";

import type { CmsLink } from "../link";

export interface CmsResourceCard {
  _key?: string;
  _type: "resourceCard";

  title: string;
  summary?: string;

  link?: CmsLink;

  image?: CmsImage;

  fileType?: string;
  fileSize?: string;

  tags?: string[];

  actionLabel?: string;
}
