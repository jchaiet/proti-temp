import {Button, Flex, Stack} from '@sanity/ui'
import {useCallback} from 'react'
import {set, type StringInputProps, useFormValue} from 'sanity'

export function generateSingletonKey(value?: string): string {
  if (!value) {
    return ''
  }

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function SingletonKeyInput(props: StringInputProps) {
  const {onChange} = props
  const title = useFormValue(['title'])

  const generatedKey = generateSingletonKey(typeof title === 'string' ? title : undefined)

  const handleGenerate = useCallback(() => {
    if (!generatedKey) {
      return
    }

    onChange(set(generatedKey))
  }, [generatedKey, onChange])

  return (
    <Stack gap={2}>
      {props.renderDefault(props)}

      <Flex justify="flex-end">
        <Button
          disabled={!generatedKey}
          mode="ghost"
          text="Generate from Name"
          onClick={handleGenerate}
        />
      </Flex>
    </Stack>
  )
}
