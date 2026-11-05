# Sanity content model

The canonical schema registry is `studio/schemaTypes/index.ts`. Document types live in `studio/schemaTypes/documents/`, reusable blocks in `blocks/`, UI objects in `objects/`, and form field definitions in `forms/`.

## Core documents

| Document (`_type`) | What editors manage                                                                          | Route/relationship                                                  |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `site`             | Identity, domains, canonical domain, locales, default navigation, SEO defaults, Organization | One Site selected by request host                                   |
| `page`             | Hierarchy, homepage status, SEO, Page Content sections                                       | Site + Locale + parent/slug hierarchy                               |
| `blog`             | Title, summary, image, dates, author/reviewer, sources, taxonomy, sections, SEO              | Site + Locale + blog slug                                           |
| `author`           | Author identity, profile, bio, credentials, expertise, locale-specific fields                | Site + shared author slug; locale-aware profile output              |
| `taxonomy`         | Term/group hierarchy, translations, visitor/blog assignment switches                         | Site-scoped taxonomy and blog taxonomy routes                       |
| `navigationHeader` | Header menu                                                                                  | Site + Locale + key                                                 |
| `navigationFooter` | Footer menu                                                                                  | Site + Locale + key                                                 |
| `navigationSet`    | Locale-specific Header/Footer composition                                                    | Referenced by Site default navigation or page override              |
| `modal`            | Reusable CTA-targeted overlay                                                                | Keyed reusable content                                              |
| `singleton`        | Reusable content referenced by blocks                                                        | Keyed reusable content                                              |
| `redirect`         | Authored redirect rules                                                                      | Evaluated before content routing for public requests                |
| `translationGroup` | Legacy/optional translation metadata type                                                    | **Not** used for routine same-path Page/Blog translation resolution |

## Page authoring

Pages are listed by Site, Locale, and hierarchy. A homepage is marked with `isHomepage`; other pages use a URL Segment with an optional parent. The actual path is composed from parent segments, so the child `widget` under `products` becomes `/products/widget` in the default locale. See [Translations](TRANSLATIONS.md) for prefixes.

The Page schema currently offers Hero, Carousel, Accordion, Content, Tabs, Form, Grid, Document List, and Singleton Reference sections. Blog sections include Content, Rich Text, Carousel, Accordion, Tabs, Grid, Form, Document List, Poll, and Singleton Reference (the precise allowed list is defined in each document schema).

Use descriptive semantic headings. `studio/schemaTypes/validation/headingQuality.ts` validates page/blog heading quality and uses the Portable Text heading levels (H1–H6), rather than inferring an HTML level from which block the editor selected.

## Blog editorial data

Blogs expose publish/update dates, optional reviewer and review date, source citations, featured image with accessible alt text, taxonomy, Site + Locale and SEO fields. Blog tagging choices are governed by Taxonomy Term usage; groups/folders are organizational and should not be assigned as article topics.

## Author localization

An Author is a **single Site-level document**. Default-locale fields include name, job title, bio, image/alt, expertise, credentials, affiliation and identity URLs. The `translations` array contains per-locale display fields (name, job title, expertise, bio, image alt). The Web resolver selects localized entries and uses the default record as fallback where appropriate. Blog bylines and linked profiles share the same Author identity.

A translated Author profile should not be advertised in hreflang unless the required localized entry exists. See [SEO/GEO](SEO_GEO.md).

## Taxonomy kinds and usage flags

- **Group / Folder**: hierarchy-only; not an assignable blog topic.
- **Taxonomy Term**: assignable subject with independent **Available for Blog Tagging** and **Include in Visitor Filters** controls.
- Taxonomy translations are locale-specific labels/descriptions in the same taxonomy document.

Filtering groups on a Document List are **explicit editor-configured groups**, not automatically generated from taxonomy parents. Each group's selected terms and Any/All semantics are independent; groups combine with AND. See [Components](COMPONENTS.md).

## Relationships and validation

Schema validation prevents illegal Site/Locale references, malformed slugs and domains, incompatible navigation assignments, invalid taxonomy parents, and inaccessible image metadata. When altering a field contract, update the schema, GROQ projections, resolvers/mappers, and tests together; stored content may still use legacy fields.

Related: [Editor Guide](EDITOR_GUIDE.md), [Components](COMPONENTS.md), [Architecture](ARCHITECTURE.md).
