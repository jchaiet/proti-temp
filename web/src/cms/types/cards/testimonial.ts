import type { CmsImage } from "../image";

export interface CmsTestimonialAuthor {
  name?: string;
  title?: string;
  company?: string;
  avatar?: CmsImage;
}

export interface CmsTestimonialCard {
  _key?: string;
  _type: "testimonialCard";

  quote: string;

  author?: CmsTestimonialAuthor;

  rating?: number;

  companyLogo?: CmsImage;
}
