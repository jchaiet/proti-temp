import { ACCORDION_BLOCK_FRAGMENT } from "./accordion";
import { CAROUSEL_BLOCK_FRAGMENT } from "./carousel";
import { CONTENT_BLOCK_FRAGMENT } from "./content";
import { DOCUMENT_LIST_BLOCK_FRAGMENT } from "./documentList";
import { FORM_BLOCK_FRAGMENT } from "./form";
import { GRID_BLOCK_FRAGMENT } from "./grid";
import { HERO_BLOCK_FRAGMENT } from "./hero";
import { POLL_BLOCK_FRAGMENT } from "./poll";
import { RICH_TEXT_BLOCK_FRAGMENT } from "./richText";
import { TABS_BLOCK_FRAGMENT } from "./tabs";

export const SINGLETON_REFERENCE_BLOCK_FRAGMENT = `
  _type == "singletonReferenceBlock" => {
    "singleton": select(
      singleton->site._ref == $siteId &&
      singleton->locale == $locale => singleton->{
      _id,
      title,
      key,
      locale,

      "component": component[0] {
        _key,
        _type,

        ${HERO_BLOCK_FRAGMENT},
        ${CAROUSEL_BLOCK_FRAGMENT},
        ${ACCORDION_BLOCK_FRAGMENT},
        ${CONTENT_BLOCK_FRAGMENT},
        ${TABS_BLOCK_FRAGMENT},
        ${FORM_BLOCK_FRAGMENT},
        ${GRID_BLOCK_FRAGMENT},
        ${DOCUMENT_LIST_BLOCK_FRAGMENT},
        ${RICH_TEXT_BLOCK_FRAGMENT},
        ${POLL_BLOCK_FRAGMENT}
      }
      }
    )
  }
`;
