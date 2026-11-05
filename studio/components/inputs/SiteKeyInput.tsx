import {Button, Stack} from '@sanity/ui'
import {set, type StringInputProps, useFormValue} from 'sanity'

function generateSiteKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
export function SiteKeyInput(props: StringInputProps) {
  const siteName = useFormValue(['name']) as string | undefined

  const handleGenerate = () => {
    if (!siteName) {
      return
    }

    props.onChange(set(generateSiteKey(siteName)))
  }

  return (
    <Stack padding={4} gap={4}>
      {props.renderDefault(props)}
      <Button
        mode="ghost"
        text="Generate from Site Name"
        disabled={!siteName}
        onClick={handleGenerate}
      />
    </Stack>
  )
}
