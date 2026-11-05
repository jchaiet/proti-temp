import type { CmsImage } from "../image";
import type { CmsLink } from "../link";

export interface CmsFullBleedCard {
  image?: CmsImage;
  title: string;
  description?: string;
  link?: CmsLink;
  expandable?: boolean;
}
