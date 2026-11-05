import { BlockRenderer } from "@/components/BlockRenderer";
import { getModals } from "@/sanity/queries/modal";

import {
  ModalRegistryClient,
  type ModalRegistryEntry,
} from "./ModalRegistryClient";

export interface ModalRegistryProps {
  siteId: string;
  locale: string;
  visualEditing?: boolean;
}

function cleanId(id?: string): string {
  return id?.replace(/^drafts\./, "") ?? "";
}

export async function ModalRegistry({
  siteId,
  locale,
  visualEditing = false,
}: ModalRegistryProps) {
  const modals = await getModals({
    siteId,
    locale,
    visualEditing,
  });

  if (!modals.length) {
    return null;
  }

  const entries = modals
    .map<ModalRegistryEntry | null>((modal) => {
      const id = cleanId(modal._id);

      if (!id) {
        return null;
      }

      return {
        id,
        title: modal.modalTitle,
        description: modal.description,
        ariaLabel: modal.title,
        size: modal.size ?? "md",
        content: (
          <BlockRenderer
            blocks={modal.content ?? []}
            context={{
              siteId,
              locale,
              visualEditing,
            }}
          />
        ),
      };
    })
    .filter((entry): entry is ModalRegistryEntry => entry !== null);

  if (!entries.length) {
    return null;
  }

  return <ModalRegistryClient modals={entries} />;
}
