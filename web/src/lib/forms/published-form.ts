import "server-only";

import { sanityClient } from "@/sanity/client";
import type { PublishedFormDefinition } from "./validation";

/* Only published forms are accepted. The _key disambiguates forms with
 * identical editor-defined formKey values in the same Site and locale. */
const FIELD_PROJECTION = `
  _type, name, type, value, required, disabled,
  minLength, maxLength, min, max, minDate, maxDate, multiple,
  options[]{value, disabled},
  fields[]{
    _type, name, type, value, required, disabled,
    minLength, maxLength, min, max, minDate, maxDate, multiple,
    options[]{value, disabled},
    fields[]{_type, name, type, value, required, disabled, minLength, maxLength, min, max, minDate, maxDate, multiple, options[]{value, disabled}}
  }
`;

const FORM_PROJECTION = `
  _key, formMode, webhookDestination,
  fields[]{${FIELD_PROJECTION}},
  steps[]{fields[]{${FIELD_PROJECTION}}}
`;

export const PUBLISHED_FORM_QUERY = `
  *[
    _type in ["page", "blog", "modal", "singleton"] &&
    site._ref == $siteId && locale == $locale &&
    (
      count(sections[_type == "formBlock" && _key == $blockKey && formKey.current == $formKey]) > 0 ||
      count(content[_type == "formBlock" && _key == $blockKey && formKey.current == $formKey]) > 0 ||
      count(component[_type == "formBlock" && _key == $blockKey && formKey.current == $formKey]) > 0
    )
  ]{
    "onPage": sections[_type == "formBlock" && _key == $blockKey && formKey.current == $formKey]{${FORM_PROJECTION}},
    "inModal": content[_type == "formBlock" && _key == $blockKey && formKey.current == $formKey]{${FORM_PROJECTION}},
    "inSingleton": component[_type == "formBlock" && _key == $blockKey && formKey.current == $formKey]{${FORM_PROJECTION}}
  }
`;

type FormRecord = {
  onPage?: PublishedFormDefinition[];
  inModal?: PublishedFormDefinition[];
  inSingleton?: PublishedFormDefinition[];
};

export async function findPublishedForm(params: {
  siteId: string;
  locale: string;
  formKey: string;
  blockKey: string;
}): Promise<PublishedFormDefinition | null> {
  const client = sanityClient.withConfig({
    perspective: "published",
    useCdn: false,
  });
  const results = await client.fetch<FormRecord[]>(
    PUBLISHED_FORM_QUERY,
    params,
    {
      next: { revalidate: 0 },
    },
  );
  const forms = results.flatMap((result) => [
    ...(result.onPage ?? []),
    ...(result.inModal ?? []),
    ...(result.inSingleton ?? []),
  ]);
  // Ambiguous entries are rejected rather than guessing an authorization schema.
  return forms.length === 1 ? forms[0] : null;
}
