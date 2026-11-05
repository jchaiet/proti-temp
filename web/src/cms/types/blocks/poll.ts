import type { CmsSectionHeading } from "../section-heading";

export type CmsPollLayout = "buttons" | "cards" | "list";

export interface CmsPollOption {
  _key: string;

  id: string;
  label: string;
}

export interface CmsPollBlock {
  _key: string;
  _type: "pollBlock";

  heading?: CmsSectionHeading;

  pollKey?: {
    current?: string;
  };

  options?: CmsPollOption[];

  layout?: CmsPollLayout;

  alignment?: "left" | "center" | "right";

  showResultsOnSubmit?: boolean;

  resultsType?: "percentageBars" | "counts" | "singleOptionCount";

  singleResultOptionId?: string;

  singleResultMessage?: string;

  thankYouMessage?: string;

  errorMessage?: string;
}
