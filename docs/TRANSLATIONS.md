# Localization and translation workflows

Proti supports Site-configured locales with public URL prefixes for non-default locales. The authoritative routing code lives in `web/src/lib/routing/` and `web/src/cms/resolvers/translation.ts`; the Studio translation action is `studio/actions/ShowTranslationsAction.tsx`.

## URL contract

| Example locale setup | URL                      |
| -------------------- | ------------------------ |
| Default `en-us`      | `/products/widget`       |
| Additional `es-us`   | `/es-us/products/widget` |

The relative content path stays the same when a direct translation exists. The default locale is deliberately unprefixed; a request explicitly including the default prefix is redirected to its canonical unprefixed form. Published routing uses the Site selected from the request host.

**Historical compatibility:** older fixtures can contain locale aliases such as `us-es`; the implementation's preferred format is lowercase language-region (`es-us`). This matters when copying URL examples from older documentation.

## Exact translation rules

- **Page** translation: matching Site + relative hierarchy/path + target locale. Hierarchical parents are resolved/created first by the translation action.
- **Blog** translation: matching Site + same slug + target locale. A shared slug is valid because locale public paths differ.
- **Navigation Header/Footer/Set**: match by Site + stable key + locale. A translated Set resolves/creates its translated Header/Footer. Internal Page links are remapped to target-locale equivalents if available.
- **Singleton and Modal**: keyed locale-specific content types exist in the translation action implementation; confirm that a type's action is registered in `studio/sanity.config.ts` before expecting it in the document actions menu.
- **Author**: unlike Page/Blog, one Author document stores translations in its `translations` array; it is not created via a separate Author document translation action.
- **Taxonomy**: translated labels/descriptions live in each taxonomy document's `translations` array.

`translationGroup` remains a registered schema type but is **not required** for routine same-path Page/Blog translation resolution.

## Editor workflow

1. Ensure target locale is added under the Site's Supported Locales.
2. Publish or save the source document with a valid Site, Locale and route identity.
3. Use the **Translations** document action where offered.
4. For a nested Page, inspect the parent chain: missing target parents may be created as part of translation creation; publish/verify them before expecting public routes to work.
5. Translate actual text, alt text, navigation labels, SEO metadata and links; don't assume the copied source content is ready for publication.
6. Publish the translated document and verify its public route.

## Language selector and hreflang

`web/src/components/SiteLayout/HeaderUtilities/HeaderUtilities.tsx` shows **only exact available alternate translations**. When there is no alternate, the language control is hidden; a missing translation does **not** produce a homepage fallback option. Query parameters are preserved on supported exact language switches.

`web/src/lib/routing/public-url.ts` builds public locale URLs and language alternates. Hreflang URLs use the Site's canonical origin and BCP 47 language tags (`en-US`, `es-US`), and should only reference real, indexable localized equivalents according to the SEO resolver. See [SEO/GEO](SEO_GEO.md).

## Translation quality checks

- Confirm each locale resolves the intended page, not another Site or a different content type.
- Confirm matching slugs/hierarchy; audit locale navigation for unintended source-language internal links.
- Confirm local Author details where required and taxonomy labels in the alternate language.
- Confirm `html[lang]`, canonical URL, and hreflang match published, valid translation routes.
- Confirm a missing translation leaves no broken language-toggle item or invented hreflang value.

## Source distinction

Source code includes older comments describing fallback behavior in `web/src/cms/resolvers/translation.ts`; the current language control implementation filters out missing exact translation URLs. For user-facing behavior, follow the component and end-to-end verification, not that older comment.
