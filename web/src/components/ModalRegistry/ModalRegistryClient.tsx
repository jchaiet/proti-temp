"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Modal } from "mino-ui/core/Modal";

import type { CmsModalSize } from "@/cms/types";

const MINO_OPEN_MODAL_EVENT = "mino:open-modal";

export interface ModalRegistryEntry {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  size?: CmsModalSize;
  content: ReactNode;
}

export interface ModalRegistryClientProps {
  modals: ModalRegistryEntry[];
}

function getRequestedModalId(event: Event): string | null {
  const detail = (event as CustomEvent<unknown>).detail;

  if (!detail || typeof detail !== "object") {
    return null;
  }

  const id = (detail as { id?: unknown }).id;

  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function ModalRegistryClient({ modals }: ModalRegistryClientProps) {
  const [activeModalId, setActiveModalId] = useState<string | null>(null);

  const modalsById = useMemo(
    () => new Map(modals.map((modal) => [modal.id, modal] as const)),
    [modals],
  );

  useEffect(() => {
    const handleOpenModal = (event: Event) => {
      const requestedId = getRequestedModalId(event);

      if (!requestedId || !modalsById.has(requestedId)) {
        return;
      }

      setActiveModalId(requestedId);
    };

    window.addEventListener(MINO_OPEN_MODAL_EVENT, handleOpenModal);

    return () => {
      window.removeEventListener(MINO_OPEN_MODAL_EVENT, handleOpenModal);
    };
  }, [modalsById]);

  const activeModal = activeModalId ? modalsById.get(activeModalId) : undefined;

  if (!activeModal) {
    return null;
  }

  return (
    <Modal
      isOpen
      onClose={() => setActiveModalId(null)}
      title={activeModal.title}
      description={activeModal.description}
      ariaLabel={activeModal.ariaLabel}
      size={activeModal.size ?? "md"}
    >
      {activeModal.content}
    </Modal>
  );
}
