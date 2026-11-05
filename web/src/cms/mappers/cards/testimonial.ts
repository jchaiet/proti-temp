import type { TestimonialCardProps } from "mino-ui/cards/TestimonialCard";

import type { CmsTestimonialCard } from "@/cms/types";

import {
  resolveSanityImage,
  resolveSanityImageDimensions,
} from "@/cms/resolvers/image";

export function mapTestimonialCard(
  card: CmsTestimonialCard,
): TestimonialCardProps | null {
  if (!card.quote || !card.author?.name) {
    return null;
  }

  const logoDimensions = resolveSanityImageDimensions(card.companyLogo);

  return {
    quote: card.quote,

    author: {
      name: card.author.name,

      title: card.author.title,

      company: card.author.company,

      avatarUrl: resolveSanityImage(card.author.avatar, { width: 240 }),
    },

    rating: card.rating,

    companyLogoUrl: resolveSanityImage(card.companyLogo, { width: 320 }),
    companyLogoWidth: logoDimensions?.width,
    companyLogoHeight: logoDimensions?.height,
  };
}
