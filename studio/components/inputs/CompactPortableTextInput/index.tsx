import type {InputProps, PortableTextInputProps} from 'sanity'

export function CompactPortableTextInput(props: InputProps) {
  const portableTextProps = props as PortableTextInputProps

  return (
    <div data-compact-portable-text>
      <style>
        {`
          [data-compact-portable-text]
          [data-testid='pt-editor'][data-fullscreen='false'] {
            height: 80px;
            min-height: 80px;
          }
        `}
      </style>

      {portableTextProps.renderDefault({
        ...portableTextProps,
        initialActive: true,
      })}
    </div>
  )
}
