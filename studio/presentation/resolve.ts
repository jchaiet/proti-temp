import {
  defineLocations,
  type PresentationPluginOptions,
} from "sanity/presentation";

function locateHref(type: string, id?: string, locale?: string): string {
  if (!id) {
    return "/";
  }

  const search = new URLSearchParams({
    type,
    id: id.replace(/^drafts\./, ""),
  });

  if (locale) {
    search.set("locale", locale);
  }

  return `/api/draft-mode/locate?${search.toString()}`;
}

export const presentationResolve: PresentationPluginOptions["resolve"] = {
  locations: {
    page: defineLocations({
      select: {
        id: "_id",
        title: "title",
        locale: "locale",
      },
      resolve: (document) => ({
        locations: [
          {
            title: document?.title || "Preview Page",
            href: locateHref("page", document?.id, document?.locale),
          },
        ],
      }),
    }),

    blog: defineLocations({
      select: {
        id: "_id",
        title: "title",
        locale: "locale",
      },
      resolve: (document) => ({
        locations: [
          {
            title: document?.title || "Preview Blog",
            href: locateHref("blog", document?.id, document?.locale),
          },
        ],
      }),
    }),

    singleton: defineLocations({
      select: {
        id: "_id",
        title: "title",
        locale: "locale",
      },
      resolve: (document) => ({
        locations: [
          {
            title: `Preview ${document?.title || "Singleton"} on a consumer`,
            href: locateHref("singleton", document?.id, document?.locale),
          },
        ],
      }),
    }),

    author: defineLocations({
      select: {
        id: "_id",
        name: "name",
        defaultLocale: "site->defaultLocale",
      },
      resolve: (document) => ({
        locations: [
          {
            title: document?.name || "Preview Author",
            href: locateHref("author", document?.id, document?.defaultLocale),
          },
        ],
      }),
    }),

    taxonomy: defineLocations({
      select: {
        id: "_id",
        title: "title",
        defaultLocale: "site->defaultLocale",
      },
      resolve: (document) => ({
        locations: [
          {
            title: document?.title || "Preview Taxonomy",
            href: locateHref("taxonomy", document?.id, document?.defaultLocale),
          },
        ],
      }),
    }),

    navigationHeader: defineLocations({
      select: { id: "_id", title: "title", locale: "locale" },
      resolve: (document) => ({
        locations: [
          {
            title: document?.title || "Preview Header Navigation",
            href: locateHref(
              "navigationHeader",
              document?.id,
              document?.locale,
            ),
          },
        ],
      }),
    }),

    navigationFooter: defineLocations({
      select: { id: "_id", title: "title", locale: "locale" },
      resolve: (document) => ({
        locations: [
          {
            title: document?.title || "Preview Footer Navigation",
            href: locateHref(
              "navigationFooter",
              document?.id,
              document?.locale,
            ),
          },
        ],
      }),
    }),

    navigationSet: defineLocations({
      select: { id: "_id", title: "title", locale: "locale" },
      resolve: (document) => ({
        locations: [
          {
            title: document?.title || "Preview Navigation Set",
            href: locateHref("navigationSet", document?.id, document?.locale),
          },
        ],
      }),
    }),
  },
};
