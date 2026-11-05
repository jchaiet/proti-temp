import type { JsonLdObject } from "@/cms/types/structured-data";

export interface StructuredDataProps {
  data: JsonLdObject | JsonLdObject[];
}

function removeContext(item: JsonLdObject): JsonLdObject {
  /*
   * Keep this tolerant of older/future builders that may
   * accidentally include their own @context.
   *
   * The StructuredData component owns the single shared
   * Schema.org context for the entire graph.
   */
  const node = { ...item };

  delete node["@context"];

  return node;
}

function buildGraph(data: JsonLdObject | JsonLdObject[]): JsonLdObject {
  const nodes = Array.isArray(data) ? data : [data];

  return {
    "@context": "https://schema.org",

    "@graph": nodes.map(removeContext),
  };
}

function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  /*
   * Escape "<" so user-authored CMS content cannot break
   * out of the JSON-LD script element.
   */
  return JSON.stringify(buildGraph(data)).replace(/</g, "\\u003c");
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
    />
  );
}
