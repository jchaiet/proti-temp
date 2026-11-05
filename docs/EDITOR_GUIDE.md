# Sanity content editor guide

This guide covers the main tasks for non-developer editors using Proti Studio. Field names and available sections reflect the v0.3 Studio schemas in `studio/schemaTypes/`.

## 1. Choose the correct Site and Locale

The Studio structure groups content by Site and Locale. Before creating content, confirm you're in the intended Site/Locale. The Site record controls its supported locales, default locale, navigation, canonical domain and SEO defaults. Don't manually add a locale prefix to a Page's URL Segment.

## 2. Create a Page

1. Under the appropriate Site/Locale Pages section, choose a root Page or a child Page.
2. Set **Page Title** (internal/editorial), **Homepage** when applicable, and the **Parent Page** if nested.
3. Set a descriptive **URL Segment**, not the entire public URL. A child `widget` under `products` produces `/products/widget` in the default locale.
4. Add **Page Content** sections. Select a Hero/Content section for narrative content or other blocks for interactive/curated experiences.
5. Fill out SEO metadata where the Site default is insufficient; check accessibility and heading semantics.
6. Publish, open the route and verify the content on desktop and mobile.

## 3. Create a Blog

Fill Title, Summary, optional **Show Summary in Article**, Featured Image/alt text, Published Date, author and content sections. For reviewed content, use the reviewer/review date and list actual Sources. Set the Site, Locale, Blog slug, taxonomy terms and SEO information. A source citation should refer to a real source; don't fabricate one for schema completeness.

## 4. Author profiles

Create one Author identity per Site and populate default-locale name, bio, title, image/alt, expertise and optional professional credentials/affiliation. Use **Translations** on that same Author to add locale-specific names, titles, expertise and biographies. Blog bylines link to the Author page; the author profile includes authored articles for the current locale.

## 5. Taxonomy and Document Lists

- Create **Group / Folder** entries for hierarchy only; use **Taxonomy Term** for assignable subjects.
- Control **Available for Blog Tagging** independently from **Include in Visitor Filters**.
- In a Document List, choose manual items or a dynamic query scope. Configure sorting, search, filters and pagination as needed.
- To offer grouped filters, add a **Filter Group**, give it a public title, select Term values, selection mode and Any/All match logic. Separate groups narrow results together (AND).
- Enable **Require Search or Filter** when the list should stay empty until meaningful visitor input is supplied.

## 6. Navigation

Create or edit the locale's Header Navigation and Footer Navigation, compose a Navigation Set, then assign it as the Site default or a Page override. For translated navigation, use the translation action where available and review target-locale internal links before publishing. Missing translated Pages should not be silently replaced with source-locale links.

## 7. CTA Groups, reusable content and Modals

CTA Groups organize action items, their alignment and stacking. CTAs can link to pages/external destinations or open reusable Modals. When editing a Modal, verify the actual CTA opens it, and test Escape/close behavior and background scroll locking. Singleton blocks reuse centrally authored content; be aware that updates affect every place where it is referenced.

## 8. Translation workflow

For Page/Blog/Navigation/Singleton documents offering the **Translations** action, create the target locale translation and review all copied text/images/SEO data. Page translations follow the same relative path and may require translated parent Pages. Authors and Taxonomy use _fields on one document_ rather than separate translated documents. Only published, exact alternate routes appear in the public language selector.

## 9. SEO and accessibility checklist before publishing

- Correct visible H1 and subordinate H2–H6; avoid placeholder headings and unnecessary multiple H1s.
- Meaningful page title and concise description; indexing/following settings intentional.
- Accurate alt text for informative images; decorative images treated appropriately.
- Real author/editorial/reviewer details and citations where relevant.
- Canonical override only when deliberately choosing another canonical URL.
- Internal links point to appropriate published locale pages.
- Final preview tested before publication, then verify the **published** route.

See [Translations](TRANSLATIONS.md), [SEO/GEO](SEO_GEO.md), and [Components](COMPONENTS.md) for detailed behavior.
