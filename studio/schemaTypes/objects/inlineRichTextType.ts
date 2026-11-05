import {defineType} from 'sanity'

import {CompactPortableTextInput} from '../../components/inputs/CompactPortableTextInput'
import {createPortableTextBlock} from './portableTextBlock'

export const inlineRichTextType = defineType({
  name: 'inlineRichText',
  title: 'Rich Text',
  type: 'array',

  components: {
    input: CompactPortableTextInput,
  },

  of: [
    createPortableTextBlock({
      allowLists: false,
      allowBlockquote: false,
    }),
  ],

  validation: (Rule) => Rule.max(1).error('This field supports a single block of rich text.'),
})
