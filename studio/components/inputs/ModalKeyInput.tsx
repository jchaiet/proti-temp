import {useCallback} from 'react'

import {Button, Stack} from '@sanity/ui'
import {set, type StringInputProps, useFormValue} from 'sanity'

function toKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function ModalKeyInput(props: StringInputProps) {
  const {onChange, value} = props
  const modalName = useFormValue(['title'])
  const generatedKey = typeof modalName === 'string' ? toKey(modalName) : ''

  const handleGenerate = useCallback(() => {
    if (!generatedKey) {
      return
    }

    onChange(set(generatedKey))
  }, [generatedKey, onChange])

  return (
    <Stack gap={2}>
      {props.renderDefault(props)}

      <Button
        text="Generate from Modal Name"
        mode="ghost"
        disabled={!generatedKey || Boolean(value)}
        onClick={handleGenerate}
      />
    </Stack>
  )
}
