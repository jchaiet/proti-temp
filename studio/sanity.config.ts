import {
  defineConfig,
  type DocumentActionComponent,
  type DocumentActionsContext,
  type Template,
} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {media} from 'sanity-plugin-media'
import {ShowTranslationsAction} from './actions/ShowTranslationsAction'
import {presentationResolve} from './presentation/resolve'
import {presentationAllowedOrigins} from './utils/presentationOrigins'

import './styles/studio.css'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'
const studioTitle = process.env.SANITY_STUDIO_TITLE || 'Proti Studio'
const previewUrl = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:3000'

if (!projectId) {
  throw new Error(
    'Missing SANITY_STUDIO_PROJECT_ID. Run "pnpm proti:init" from the repository root or configure the Studio environment variable.',
  )
}

export default defineConfig({
  name: 'default',
  title: studioTitle,
  projectId,
  dataset,

  plugins: [
    structureTool({structure}),
    presentationTool({
      previewUrl: {
        initial: previewUrl,
        previewMode: {
          enable: '/api/draft-mode/enable',
          disable: '/api/draft-mode/disable',
        },
      },
      allowOrigins: presentationAllowedOrigins(previewUrl, process.env.NODE_ENV === 'production'),
      resolve: presentationResolve,
    }),
    visionTool(),
    media(),
  ],

  document: {
    actions: (
      prev: DocumentActionComponent[],
      context: DocumentActionsContext,
    ): DocumentActionComponent[] => {
      if (
        context.schemaType === 'page' ||
        context.schemaType === 'blog' ||
        context.schemaType === 'singleton' ||
        context.schemaType === 'navigationHeader' ||
        context.schemaType === 'navigationFooter' ||
        context.schemaType === 'navigationSet'
      ) {
        return [...prev, ShowTranslationsAction]
      }

      return prev
    },
  },

  schema: {
    types: schemaTypes,

    templates: (prev: Template[]): Template[] => [
      ...prev.filter(
        (template) =>
          template.schemaType !== 'page' &&
          template.schemaType !== 'blog' &&
          template.schemaType !== 'singleton' &&
          template.schemaType !== 'taxonomy' &&
          template.schemaType !== 'navigationHeader' &&
          template.schemaType !== 'navigationFooter' &&
          template.schemaType !== 'navigationSet' &&
          template.schemaType !== 'redirect',
      ),

      {
        id: 'page-root',
        title: 'Page',
        schemaType: 'page',
        parameters: [
          {name: 'siteId', type: 'string'},
          {name: 'locale', type: 'string'},
        ],
        value: ({siteId, locale}: {siteId: string; locale: string}) => ({
          site: {_type: 'reference', _ref: siteId},
          locale,
          isHomepage: false,
        }),
      },

      {
        id: 'page-child',
        title: 'Child Page',
        schemaType: 'page',
        parameters: [
          {name: 'siteId', type: 'string'},
          {name: 'locale', type: 'string'},
          {name: 'parentId', type: 'string'},
        ],
        value: ({
          siteId,
          locale,
          parentId,
        }: {
          siteId: string
          locale: string
          parentId: string
        }) => ({
          site: {_type: 'reference', _ref: siteId},
          locale,
          parent: {_type: 'reference', _ref: parentId},
          isHomepage: false,
        }),
      },

      {
        id: 'blog-scoped',
        title: 'Blog',
        schemaType: 'blog',
        parameters: [
          {name: 'siteId', type: 'string'},
          {name: 'locale', type: 'string'},
        ],
        value: ({siteId, locale}: {siteId: string; locale: string}) => ({
          site: {_type: 'reference', _ref: siteId},
          locale,
        }),
      },

      {
        id: 'singleton-scoped',
        title: 'Singleton',
        schemaType: 'singleton',
        parameters: [
          {name: 'siteId', type: 'string'},
          {name: 'locale', type: 'string'},
        ],
        value: ({siteId, locale}: {siteId: string; locale: string}) => ({
          site: {_type: 'reference', _ref: siteId},
          locale,
        }),
      },

      {
        id: 'taxonomy-root',
        title: 'Taxonomy Term',
        schemaType: 'taxonomy',
        parameters: [{name: 'siteId', type: 'string'}],
        value: ({siteId}: {siteId: string}) => ({
          site: {_type: 'reference', _ref: siteId},
        }),
      },

      {
        id: 'taxonomy-child',
        title: 'Child Taxonomy Term',
        schemaType: 'taxonomy',
        parameters: [
          {name: 'siteId', type: 'string'},
          {name: 'parentId', type: 'string'},
        ],
        value: ({siteId, parentId}: {siteId: string; parentId: string}) => ({
          site: {_type: 'reference', _ref: siteId},
          parent: {_type: 'reference', _ref: parentId},
        }),
      },

      {
        id: 'navigation-header',
        title: 'Header Navigation',
        schemaType: 'navigationHeader',
        parameters: [
          {name: 'siteId', type: 'string'},
          {name: 'locale', type: 'string'},
        ],
        value: ({siteId, locale}: {siteId: string; locale: string}) => ({
          site: {_type: 'reference', _ref: siteId},
          locale,
          logoMode: 'site',
          align: 'center',
          variant: 'standard',
          isSticky: true,
        }),
      },

      {
        id: 'navigation-footer',
        title: 'Footer Navigation',
        schemaType: 'navigationFooter',
        parameters: [
          {name: 'siteId', type: 'string'},
          {name: 'locale', type: 'string'},
        ],
        value: ({siteId, locale}: {siteId: string; locale: string}) => ({
          site: {_type: 'reference', _ref: siteId},
          locale,
          logoMode: 'site',
        }),
      },

      {
        id: 'navigation-set',
        title: 'Navigation Set',
        schemaType: 'navigationSet',
        parameters: [
          {name: 'siteId', type: 'string'},
          {name: 'locale', type: 'string'},
        ],
        value: ({siteId, locale}: {siteId: string; locale: string}) => ({
          site: {_type: 'reference', _ref: siteId},
          locale,
          headerMode: 'custom',
          footerMode: 'custom',
        }),
      },

      {
        id: 'redirect',
        title: 'Redirect',
        schemaType: 'redirect',
        parameters: [
          {name: 'siteId', type: 'string'},
          {name: 'locale', type: 'string'},
        ],
        value: ({siteId, locale}: {siteId: string; locale: string}) => ({
          site: {_type: 'reference', _ref: siteId},
          locale,
          redirectType: 'permanent',
          preserveQuery: true,
          enabled: true,
          destination: {_type: 'redirectDestination', type: 'internal'},
        }),
      },

      {
        id: 'author',
        title: 'Author',
        schemaType: 'author',
        parameters: [{name: 'siteId', type: 'string'}],
        value: ({siteId}: {siteId: string}) => ({
          site: {_type: 'reference', _ref: siteId},
        }),
      },
    ],
  },
})
