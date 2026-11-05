import type { ButtonProps } from "mino-ui/core/Button";

import type { CmsCta } from "@/cms/types";

import { resolveIcon } from "@/cms/resolvers/icon";
import { resolveLink } from "@/cms/resolvers/link";

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

function commonButtonProps(
  cta: CmsCta,
): Pick<
  ButtonProps,
  "label" | "variant" | "size" | "inverted" | "icon" | "iconAlignment"
> {
  return {
    label: cta.label,
    variant: cta.variant ?? "primary",
    size: cta.size ?? "md",
    inverted: cta.inverted ?? false,
    icon: resolveIcon(cta.icon),
    iconAlignment: cta.iconAlignment ?? "right",
  };
}

export async function mapCta(cta: CmsCta): Promise<ButtonProps | null> {
  const actionType = cta.actionType ?? "link";
  const common = commonButtonProps(cta);

  if (actionType === "modal") {
    const modalId = cleanId(cta.modal?._ref);

    if (!modalId) {
      return null;
    }

    return {
      as: "button",
      ...common,
      modalPayload: {
        id: modalId,
      },
    };
  }

  if (!cta.link) {
    return null;
  }

  const resolvedLink = await resolveLink(cta.link);

  if (!resolvedLink) {
    return null;
  }

  return {
    as: "a",
    ...common,
    href: resolvedLink.href,
    target: resolvedLink.target,
    rel: resolvedLink.rel,
  };
}

export async function mapCtas(
  ctas: CmsCta[] | null | undefined,
): Promise<ButtonProps[]> {
  if (!ctas?.length) {
    return [];
  }

  const results = await Promise.all(ctas.map(mapCta));

  return results.filter((cta): cta is ButtonProps => cta !== null);
}
