import {defineArrayMember, defineField, defineType} from 'sanity'

import {PageLocaleInput} from '../../components/inputs/PageLocaleInput'
import {PageSlugInput} from '../../components/inputs/PageSlugInput'
import {validateSiteLocale} from '../validation/siteLocale'
import {validateUniqueHomepage} from '../validation/pageHomepage'
import {validatePageNavigationReference} from '../validation/navigationReferences'
import {validatePageHeadingQuality} from '../validation/headingQuality'
import {pageParentReferenceFilter, validatePageParent} from '../validation/pageParent'
import {validatePageSlug} from '../validation/pageSlug'

export const pageType = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',

  validation: (rule) =>
    rule
      .custom((document, context) => validateUniqueHomepage(document, context))
      .custom((document, context) => validatePageNavigationReference(document, context)),

  groups: [
    {
      name: 'navigation',
      title: 'Navigation',
    },
    {
      name: 'content',
      title: 'Content',
      default: true,
    },
    {
      name: 'routing',
      title: 'Routing',
    },
    {
      name: 'seo',
      title: 'SEO',
    },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      group: 'content',
      description: 'Internal/content title for this page.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'site',
      title: 'Site',
      type: 'reference',
      group: 'routing',
      description: 'Website this page belongs to.',
      to: [{type: 'site'}],
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      group: 'routing',
      description:
        'Regional language version of this page. The Site default locale is omitted from the public URL.',

      components: {
        input: PageLocaleInput,
      },

      validation: (rule) =>
        rule.required().custom((locale, context) => validateSiteLocale(locale, context)),
    }),

    defineField({
      name: 'navigation',
      title: 'Navigation',
      type: 'navigationOverride',
      group: 'navigation',
      description:
        'Inherit the Site + Locale default Navigation Set, select a custom set, or hide Header and Footer navigation for this Page.',
    }),

    defineField({
      name: 'isHomepage',
      title: 'Homepage',
      type: 'boolean',
      group: 'routing',
      description: 'Marks this Page as the homepage for this Site and Locale.',
      initialValue: false,
    }),

    defineField({
      name: 'parent',
      title: 'Parent Page',
      type: 'reference',
      group: 'routing',
      description: 'Optional parent Page. The parent path is automatically prepended to this Page.',
      hidden: ({document}) => document?.isHomepage === true,
      to: [{type: 'page'}],

      options: {
        disableNew: true,
        filter: ({document}) => pageParentReferenceFilter(document),
      },

      validation: (rule) =>
        rule.custom((parent, context) =>
          validatePageParent(parent as {_ref?: string} | undefined, context),
        ),
    }),

    defineField({
      name: 'slug',
      title: 'URL Segment',
      type: 'string',
      group: 'routing',
      description: 'This Page’s portion of the URL. Parent paths are added automatically.',
      hidden: ({document}) => document?.isHomepage === true,

      components: {
        input: PageSlugInput,
      },

      validation: (rule) => rule.custom((slug, context) => validatePageSlug(slug, context)),
    }),

    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
      description:
        'Optional search and social metadata overrides. Unset values inherit the Site + Locale SEO defaults.',
    }),

    defineField({
      name: 'sections',
      title: 'Page Content',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({type: 'heroBlock'}),
        defineArrayMember({type: 'carouselBlock'}),
        defineArrayMember({type: 'accordionBlock'}),
        defineArrayMember({type: 'contentBlock'}),
        defineArrayMember({type: 'tabsBlock'}),
        defineArrayMember({type: 'formBlock'}),
        defineArrayMember({type: 'gridBlock'}),
        defineArrayMember({type: 'documentListBlock'}),
        defineArrayMember({type: 'singletonReferenceBlock'}),
      ],
      validation: (rule) =>
        rule.custom((sections, context) => validatePageHeadingQuality(sections, context)).warning(),
    }),
  ],

  preview: {
    select: {
      title: 'title',
      slug: 'slug',
      locale: 'locale',
      site: 'site.name',
      isHomepage: 'isHomepage',
    },

    prepare({title, slug, locale, site, isHomepage}) {
      const route = isHomepage ? '/' : slug ? `/${slug}` : undefined

      return {
        title,
        subtitle: [site, locale, route].filter(Boolean).join(' • '),
      }
    },
  },
})
