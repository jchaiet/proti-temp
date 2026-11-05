import { CmsRichText } from "@/components/CmsRichText";

import type { CmsSectionHeading } from "@/cms/types";

export function mapSectionHeading(heading: CmsSectionHeading | undefined) {
  const textAlignment =
    heading?.textAlignment && heading.textAlignment !== "inherit"
      ? heading.textAlignment
      : undefined;

  return {
    eyebrow: heading?.eyebrow?.length ? (
      <CmsRichText value={heading.eyebrow} mode="inline" />
    ) : undefined,

    title: heading?.title?.length ? (
      <CmsRichText value={heading.title} mode="inline" />
    ) : undefined,

    description: heading?.description?.length ? (
      <CmsRichText value={heading.description} mode="block" />
    ) : undefined,

    disclaimer: heading?.disclaimer?.length ? (
      <CmsRichText value={heading.disclaimer} mode="inline" />
    ) : undefined,

    textAlignment,
  };
}
