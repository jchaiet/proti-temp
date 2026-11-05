import type { PollBlockProps } from "mino-ui/blocks/PollBlock";

import type { CmsPollBlock } from "@/cms/types";

import { mapSectionHeading } from "@/cms/mappers/section-heading";

export interface PollMapperContext {
  siteId: string;
  locale: string;
}

export type MappedPollBlockProps = Omit<PollBlockProps, "onVote"> & {
  pollKey: string;

  siteId: string;
  locale: string;
};

export function mapPollBlock(
  block: CmsPollBlock,
  context: PollMapperContext,
): MappedPollBlockProps {
  const heading = mapSectionHeading(block.heading);

  return {
    ...heading,

    pollKey: block.pollKey?.current ?? block._key,

    siteId: context.siteId,

    locale: context.locale,

    options:
      block.options?.map((option) => ({
        id: option.id,

        label: option.label,

        votes: 0,
      })) ?? [],

    layout: block.layout ?? "buttons",

    alignment: block.alignment ?? "center",

    resultsType: block.resultsType ?? "percentageBars",

    singleResultOptionId: block.singleResultOptionId,

    singleResultMessage:
      block.singleResultMessage ?? "{count} people found this helpful.",

    thankYouMessage: block.thankYouMessage ?? "Thank you for your feedback.",

    showResultsOnSubmit: block.showResultsOnSubmit ?? true,

    errorMessage:
      block.errorMessage ?? "Failed to record vote. Please try again.",
  };
}
