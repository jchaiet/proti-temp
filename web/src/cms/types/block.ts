import type { CmsBlockStyles } from "./block-styles";

import type {
  CmsAccordionBlock,
  CmsCarouselBlock,
  CmsHeroBlock,
  CmsContentBlock,
  CmsTabsBlock,
  CmsFormBlock,
  CmsGridBlock,
  CmsDocumentListBlock,
  CmsRichTextBlock,
  CmsPollBlock,
} from "./blocks";

type CmsReusableBlockData =
  | CmsHeroBlock
  | CmsCarouselBlock
  | CmsAccordionBlock
  | CmsContentBlock
  | CmsTabsBlock
  | CmsFormBlock
  | CmsGridBlock
  | CmsDocumentListBlock
  | CmsRichTextBlock
  | CmsPollBlock;

export type CmsReusableBlock = CmsReusableBlockData & {
  styles?: CmsBlockStyles;
};

export type CmsSingleton = {
  _id: string;
  title?: string;
  key?: string;
  locale?: string;
  component?: CmsReusableBlock;
};

export type CmsSingletonReferenceBlock = {
  _type: "singletonReferenceBlock";
  _key: string;
  singleton?: CmsSingleton;
};

export type CmsBlock = CmsReusableBlock | CmsSingletonReferenceBlock;
