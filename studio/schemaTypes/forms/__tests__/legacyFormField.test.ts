import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const schemaTypesDirectory = fileURLToPath(new URL('../../', import.meta.url))

function getSchemaSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)

    if (entry === '__tests__') {
      return []
    }

    if (statSync(path).isDirectory()) {
      return getSchemaSourceFiles(path)
    }

    if (!/\.tsx?$/.test(entry)) {
      return []
    }

    return [path]
  })
}

describe('legacy Form field schema', () => {
  it('does not register or reference the legacy formField type', () => {
    const files = getSchemaSourceFiles(schemaTypesDirectory)

    const legacyReferences = files.flatMap((path) => {
      const source = readFileSync(path, 'utf8')

      const matches = [
        /\bformFieldType\b/.test(source),
        /\btype\s*:\s*['"]formField['"]/.test(source),
        /\bname\s*:\s*['"]formField['"]/.test(source),
      ]

      return matches.some(Boolean) ? [path] : []
    })

    expect(legacyReferences).toEqual([])
  })
})
