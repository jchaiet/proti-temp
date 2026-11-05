import type { BreadcrumbItem } from "@/cms/types/structured-data";

function titleFromSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildBreadcrumbItems({
  origin,
  localePrefix,
  segments,
  leafTitle,
  leafUrl,
}: {
  origin: string;

  localePrefix: string;

  segments: string[];

  leafTitle?: string;
  leafUrl?: string;
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    {
      name: "Home",
      url:
        segments.length === 0 && leafUrl
          ? leafUrl
          : new URL(localePrefix || "/", `${origin}/`).toString(),
    },
  ];

  if (segments.length === 0) {
    return items;
  }

  for (let index = 0; index < segments.length; index++) {
    const partial = segments.slice(0, index + 1);

    const path = `${localePrefix}/${partial.join("/")}`.replace(/\/+/g, "/");

    const isLeaf = index === segments.length - 1;

    items.push({
      name: isLeaf && leafTitle ? leafTitle : titleFromSegment(segments[index]),

      url: isLeaf && leafUrl ? leafUrl : new URL(path, `${origin}/`).toString(),
    });
  }

  return items;
}
