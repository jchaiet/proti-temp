# Page Builder components and Mino UI integration

Editors author sections in Sanity; the Web app queries content, maps it to component props, and renders using Mino UI where applicable. This separates CMS storage from presentational component behavior.

## Current block catalogue

| Block               | Editorial purpose                                               | Web mapping/rendering                                        |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Hero                | Prominent heading/media/CTA section; multiple layouts/alignment | `hero.ts` / `BlockRenderer/Hero.tsx`                         |
| Content             | Content + optional media with default/split layouts             | `content.ts` / `Content.tsx`                                 |
| Carousel            | Repeated slide/card experiences                                 | `carousel.ts` / `Carousel.tsx`                               |
| Accordion           | Expand/collapse content groups                                  | `accordion.ts` / `Accordion.tsx`                             |
| Tabs                | Tabbed content                                                  | `tabs.tsx` / `Tabs.tsx`                                      |
| Grid                | Layout for card or image items, optionally split                | `grid.tsx` / `Grid.tsx`                                      |
| Form                | Editor-configurable input fields and form layouts               | `form.tsx` / `Form.tsx`                                      |
| Document List       | Curated or dynamic content with search/filter/sort/paging       | `document-list.ts` / `DocumentList.tsx`                      |
| Rich Text           | Portable Text body sections                                     | `rich-text.tsx` / `RichText.tsx`                             |
| Poll                | Interactive question and vote behavior                          | `poll.ts` / `Poll.tsx`                                       |
| Singleton Reference | Include reusable authored content                               | `studio/.../singletonReferenceBlockType.ts`; `BlockRenderer` |

Not every document allows every block: consult `studio/schemaTypes/documents/pageType.ts` and `blogType.ts`. The registry is `studio/schemaTypes/index.ts`.

## Shared heading and block styling

The shared `sectionHeading` object supports structured title/description, including actual heading levels. Placement and typography alignment are separate concerns: an author may align the content area differently from how text is aligned.

`blockStyles` provides semantic authoring controls: vertical padding, background, and content width. The renderer applies them through `web/src/components/BlockRenderer/BlockStyles/`. The values are design-system choices, **not arbitrary CSS**. Mino UI CSS variables can be customized through Web overrides (`web/src/app/mino-overrides.css`).

## CTAs and modals

Use the shared `ctaGroup` object for CTA items, alignment and stack direction where offered. A CTA can target a link or authored Modal. Modal rendering and accessibility behavior live in Web/Mino UI (`ModalRegistry` and UI components): test focus management, Escape dismissal, and background scroll locking after changes. Avoid replacing working modal behavior with manual DOM overlays.

## Grid and cards

Grid accepts image and supported card types (Article, Resource, Testimonial, Full Bleed), along with split/stacked layout options. **Desktop Columns** is the principal authored column count; the responsive renderer handles smaller breakpoints (mobile single column, tablet up to two, subject to the layout).

## Document List behavior

Document List supports manual selection and dynamic lists. Dynamic settings include content types, initial taxonomy constraints, initial sorting, search, visitor filters, optional grouped taxonomy filters, visitor sorting, and loading more results.

**Require Search or Filter** keeps the list in an initial state until the visitor enters a meaningful search or selects an active filter. Its stored field remains `requireSearchQuery` for compatibility. A reset/All choice does not count as an active filter; a completed query with no matches displays the empty state.

Each visitor Filter Group specifies its title, single/multiple selection, allowed Term values, and Any/All semantics **within the group**. Separate groups combine with AND. Sorting offers Relevance, Newest, Oldest, Title A–Z, Title Z–A, plus editor-configured supported custom sorts; arbitrary GROQ is not exposed to editors.

## Extend a block safely

1. Add or edit a schema object and register it in `studio/schemaTypes/index.ts`.
2. Project its data in `web/src/sanity/fragments/blocks/` and any related queries.
3. Add/change types under `web/src/cms/types/blocks/`.
4. Update mapper under `web/src/cms/mappers/blocks/` and renderer under `web/src/components/BlockRenderer/`.
5. Preserve fallback handling for existing content; add focused tests in both projects.
6. Validate Studio editing, Web rendering, mobile accessibility and Playwright screenshots.

For exact property names always defer to the current Studio schema—not screenshots or older documentation.
