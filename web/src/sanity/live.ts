import { defineLive } from "next-sanity/live";

import { sanityClient } from "@/sanity/client";

const studioUrl =
  process.env.NEXT_SANITY_STUDIO_URL?.trim() || "http://localhost:3333";

const STEGA_CONFIGURATION_FIELDS = new Set([
  "accordionPosition",
  "alignment",
  "appearance",
  "blockLayout",
  "cardType",
  "category",
  "contentType",
  "defaultMediaPosition",
  "dynamicSort",
  "dynamicTaxonomyMatchLogic",
  "filterLogic",
  "formKey",
  "formMode",
  "formPosition",
  "gridCols",
  "gridPosition",
  "hAlignment",
  "headingLevel",
  "headingSize",
  "icon",
  "iconAlignment",
  "iconName",
  "imageShape",
  "imageSize",
  "layout",
  "locale",
  "maxWidth",
  "mediaPosition",
  "mediaType",
  "mode",
  "orientation",
  "pollKey",
  "position",
  "resultsType",
  "size",
  "sort",
  "sourceMode",
  "splitMediaPosition",
  "style",
  "submitButtonIconAlignment",
  "submitButtonSize",
  "submitButtonVariant",
  "textAlignment",
  "theme",
  "vAlignment",
  "variant",
  "width",
]);

/*
 * Keep Stega configuration scoped to the Live client instead of the shared
 * sanityClient. Infrastructure code can continue using sanityClient directly
 * without accidentally receiving Stega-encoded configuration values.
 */
const liveClient = sanityClient.withConfig({
  stega: {
    studioUrl,
    filter: (props) => {
      const lastPathSegment = props.sourcePath.at(-1);

      if (
        typeof lastPathSegment === "string" &&
        STEGA_CONFIGURATION_FIELDS.has(lastPathSegment)
      ) {
        return false;
      }

      return props.filterDefault(props);
    },
  },
});

const viewerToken = process.env.SANITY_API_READ_TOKEN?.trim() || false;

export const { sanityFetch: liveSanityFetch, SanityLive } = defineLive({
  client: liveClient,
  serverToken: viewerToken,
  browserToken: viewerToken,
});
