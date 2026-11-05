import {Box, Button, Flex} from '@sanity/ui'
import {set, type StringInputProps, useFormValue} from 'sanity'

function createKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function NavigationKeyInput(props: StringInputProps) {
  const titleValue = useFormValue(['title'])
  const title = typeof titleValue === 'string' ? titleValue : ''
  const generatedKey = createKey(title)

  const handleGenerate = () => {
    if (!generatedKey || props.readOnly) {
      return
    }

    props.onChange(set(generatedKey))
  }

  return (
    <Flex align="flex-end" gap={2}>
      <Box flex={1}>{props.renderDefault(props)}</Box>

      <Button
        disabled={props.readOnly || !generatedKey}
        mode="ghost"
        onClick={handleGenerate}
        text="Generate"
        type="button"
      />
    </Flex>
  )
}
