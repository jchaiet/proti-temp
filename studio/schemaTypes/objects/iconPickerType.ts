import {defineType} from 'sanity'

import {IconPickerInput} from '../../components/inputs/IconPickerInput'

export const iconPickerType = defineType({
  name: 'iconPicker',
  title: 'Icon',
  type: 'string',

  components: {
    input: IconPickerInput,
  },
})
