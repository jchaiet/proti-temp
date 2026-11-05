import { defineEnableDraftMode } from "next-sanity/draft-mode";

import { sanityClient } from "@/sanity/client";

export const { GET } = defineEnableDraftMode({
  client: sanityClient.withConfig({
    token: process.env.SANITY_API_READ_TOKEN || "",
  }),
});
