import {Button, Card, Stack, Text} from '@sanity/ui'
import {useEffect, useState} from 'react'
import {set, type StringInputProps, useClient, useFormValue} from 'sanity'

type PageReference = {
  _ref?: string
}

type ParentPage = {
  slug?: string
  isHomepage?: boolean
  parent?: PageReference
}

function generateSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function PageSlugInput(props: StringInputProps) {
  const client = useClient({
    apiVersion: '2026-08-21',
  })

  const title = useFormValue(['title']) as string | undefined
  const parent = useFormValue(['parent']) as PageReference | undefined

  const [resolvedPath, setResolvedPath] = useState('/')

  const slug = props.value ?? ''

  useEffect(() => {
    let active = true

    async function resolvePath() {
      const segments: string[] = []

      if (slug) {
        segments.push(slug)
      }

      let currentParent = parent?._ref
      let depth = 0

      const draftClient = client.withConfig({
        perspective: 'drafts',
      })

      while (currentParent && depth < 50) {
        const parentId = currentParent.replace(/^drafts\./, '')

        const parentPage = await draftClient.fetch<ParentPage | null>(
          `*[
              _type == "page" &&
              _id == $parentId
            ][0]{
              slug,
              isHomepage,
              parent
            }`,
          {
            parentId,
          },
        )

        if (!parentPage) {
          break
        }

        if (parentPage.isHomepage) {
          break
        }

        if (parentPage.slug) {
          segments.unshift(parentPage.slug)
        }

        currentParent = parentPage.parent?._ref
        depth++
      }

      const path = segments.length > 0 ? `/${segments.join('/')}` : '/'

      if (active) {
        setResolvedPath(path)
      }
    }

    resolvePath()

    return () => {
      active = false
    }
  }, [client, parent?._ref, slug])

  const handleGenerate = () => {
    if (!title) {
      return
    }

    props.onChange(set(generateSlug(title)))
  }

  return (
    <Stack padding={4} gap={4}>
      {props.renderDefault(props)}

      <Button
        mode="ghost"
        text="Generate from Page Title"
        disabled={!title}
        onClick={handleGenerate}
      />

      <Card padding={3} radius={2} border>
        <Stack padding={2} gap={4}>
          <Text size={1} muted>
            Resolved Path
          </Text>

          <Text size={2}>
            <code>{resolvedPath}</code>
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}
