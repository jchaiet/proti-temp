import {defineType} from 'sanity'

import {createPortableTextBlock} from './portableTextBlock'

export const richTextType = defineType({
  name: 'richText',
  title: 'Rich Text',
  type: 'array',

  of: [
    createPortableTextBlock({
      allowLists: true,
      allowBlockquote: true,
    }),
  ],
})
