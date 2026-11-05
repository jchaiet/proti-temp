import type { ButtonProps } from "mino-ui/core/Button";
import type { ButtonGroupProps } from "mino-ui/core/ButtonGroup";

import type { CmsCta, CmsCtaAlignment, CmsCtaGroup } from "@/cms/types";

import { mapCtas } from "./cta";

export interface MapCtaGroupOptions {
  fallbackAlignment?: CmsCtaAlignment;

  /** Temporary compatibility for documents authored before ctaGroup existed. */
  legacyItems?: CmsCta[];
  legacyAlignment?: CmsCtaAlignment;
  legacyStackOnMobile?: boolean;
}

export interface MappedCtaGroup {
  ctas: ButtonProps[];
  ctaGroupProps: Pick<ButtonGroupProps, "alignment" | "stackOnMobile">;
}

export async function mapCtaGroup(
  group: CmsCtaGroup | undefined,
  options: MapCtaGroupOptions = {},
): Promise<MappedCtaGroup> {
  const items = group?.items ?? options.legacyItems;

  return {
    ctas: await mapCtas(items),
    ctaGroupProps: {
      alignment:
        group?.alignment ??
        options.legacyAlignment ??
        options.fallbackAlignment ??
        "left",
      stackOnMobile:
        group?.stackOnMobile ?? options.legacyStackOnMobile ?? true,
    },
  };
}
