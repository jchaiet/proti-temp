import {pageType} from './documents/pageType'
import {siteType} from './documents/siteType'
import {blogType} from './documents/blogType'
import {taxonomyType} from './documents/taxonomyType'
import {navigationHeaderType} from './documents/navigationHeaderType'
import {navigationFooterType} from './documents/navigationFooterType'
import {navigationSetType} from './documents/navigationSetType'
import {redirectType} from './documents/redirectType'
import {authorType} from './documents/authorType'
import {singletonType} from './documents/singletonType'
import {modalType} from './documents/modalType'

import {heroBlockType} from './blocks/heroBlockType'
import {carouselBlockType} from './blocks/carouselBlockType'
import {accordionBlockType} from './blocks/accordionBlockType'
import {contentBlockType} from './blocks/contentBlockType'
import {tabsBlockType} from './blocks/tabsBlockType'
import {gridBlockType} from './blocks/gridBlockType'
import {documentListBlockType} from './blocks/documentListBlockType'
import {richTextBlockType} from './blocks/richTextBlockType'
import {pollBlockType} from './blocks/pollBlockType'
import {singletonReferenceBlockType} from './blocks/singletonReferenceBlockType'

import {articleCardType} from './cards/articleCardType'
import {resourceCardType} from './cards/resourceCardType'
import {testimonialCardType} from './cards/testimonialCardType'
import {fullBleedCardType} from './cards/fullBleedCardType'

import {ctaType} from './objects/ctaType'
import {ctaGroupType} from './objects/ctaGroupType'
import {linkType} from './objects/linkType'
import {siteLocaleType} from './objects/siteLocaleType'
import {sectionHeadingType} from './objects/sectionHeadingType'
import {blockStylesType} from './objects/blockStylesType'
import {inlineRichTextType} from './objects/inlineRichTextType'
import {richTextType} from './objects/richTextType'
import {iconPickerType} from './objects/iconPickerType'
import {gridImageItemType} from './objects/gridImageItemType'
import {authorCredentialType} from './objects/authorCredentialType'
import {citationSourceType} from './objects/citationSourceType'

import {navigationItemType} from './objects/navigationItemType'
import {navigationSubItemType} from './objects/navigationSubItemType'
import {
  navigationMegaMenuType,
  navigationMegaTileType,
  navigationMegaCardType,
  navigationMegaCategoryType,
  navigationMegaLinksSectionType,
  navigationMegaTilesSectionType,
  navigationMegaContentSectionType,
  navigationMegaExplorerSectionType,
  navigationMegaFeatureSectionType,
} from './objects/navigationMegaMenuTypes'
import {footerColumnType} from './objects/footerColumnType'
import {footerLinkType} from './objects/footerLinkType'
import {navigationSocialLinkType} from './objects/navigationSocialLinkType'
import {navigationOverrideType} from './objects/navigationOverrideType'
import {redirectDestinationType} from './objects/redirectDestinationType'

import {seoType} from './objects/seoType'
import {siteSeoDefaultsType} from './objects/siteSeoDefaultsType'

import {organizationAddressType} from './objects/organizationAddressType'
import {organizationContactPointType} from './objects/organizationContactPointType'
import {organizationStructuredDataType} from './objects/organizationStructuredDataType'

import {formBlockType} from './blocks/formBlockType'

import {translationGroupType} from './documents/translationGroupType'
import {translationEntryType} from './objects/translationEntryType'

import {
  formCalendarFieldType,
  formCheckboxFieldType,
  formDatePickerFieldType,
  formDividerFieldType,
  formFieldsetType,
  formFileUploadFieldType,
  formHiddenFieldType,
  formInputFieldType,
  formRadioGroupFieldType,
  formRadioOptionType,
  formRangeFieldType,
  formSelectFieldType,
  formSelectOptionType,
  formSpacerFieldType,
  formStepType,
  formSwitchFieldType,
  formTextareaFieldType,
} from './forms'

export const schemaTypes = [
  siteLocaleType,

  // Shared objects
  linkType,
  ctaType,
  ctaGroupType,
  blockStylesType,
  iconPickerType,

  gridImageItemType,
  authorCredentialType,
  citationSourceType,
  translationEntryType,

  // Navigation objects
  navigationItemType,
  navigationSubItemType,
  navigationMegaMenuType,
  navigationMegaTileType,
  navigationMegaCardType,
  navigationMegaCategoryType,
  navigationMegaLinksSectionType,
  navigationMegaTilesSectionType,
  navigationMegaContentSectionType,
  navigationMegaExplorerSectionType,
  navigationMegaFeatureSectionType,
  footerColumnType,
  footerLinkType,
  navigationSocialLinkType,
  navigationOverrideType,

  // Redirect objects
  redirectDestinationType,

  // SEO objects
  seoType,
  siteSeoDefaultsType,

  // Structured Data objects
  organizationAddressType,
  organizationContactPointType,
  organizationStructuredDataType,

  // Rich text types
  inlineRichTextType,
  richTextType,

  // Shared heading
  sectionHeadingType,

  // Cards
  articleCardType,
  resourceCardType,
  testimonialCardType,
  fullBleedCardType,

  // Blocks
  heroBlockType,
  carouselBlockType,
  accordionBlockType,
  contentBlockType,
  tabsBlockType,
  formBlockType,
  gridBlockType,
  documentListBlockType,
  richTextBlockType,
  pollBlockType,
  singletonReferenceBlockType,

  // Forms
  formCheckboxFieldType,
  formDatePickerFieldType,
  formDividerFieldType,
  formFieldsetType,
  formFileUploadFieldType,
  formRadioGroupFieldType,
  formRadioOptionType,
  formRangeFieldType,
  formSelectFieldType,
  formSelectOptionType,
  formSpacerFieldType,
  formSwitchFieldType,
  formTextareaFieldType,
  formInputFieldType,
  formCalendarFieldType,
  formHiddenFieldType,
  formStepType,

  // Documents
  siteType,
  pageType,
  blogType,
  authorType,
  singletonType,
  modalType,
  taxonomyType,
  navigationHeaderType,
  navigationFooterType,
  navigationSetType,
  redirectType,
  translationGroupType,
]
