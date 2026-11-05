export const translationGroupTemplate = {
  id: 'translation-group',

  title: 'Translation Group',

  schemaType: 'translationGroup',

  parameters: [
    {
      name: 'siteId',

      type: 'string',
    },
    {
      name: 'contentType',

      type: 'string',
    },
  ],

  value: ({
    siteId,
    contentType,
  }: {
    siteId: string

    contentType: 'page' | 'blog'
  }) => ({
    site: {
      _type: 'reference',

      _ref: siteId,
    },

    contentType,
  }),
}
