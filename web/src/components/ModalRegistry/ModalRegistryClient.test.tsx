import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModalRegistryClient } from "./ModalRegistryClient";

describe("ModalRegistryClient", () => {
  it("opens the requested registered Modal", () => {
    render(
      <ModalRegistryClient
        modals={[
          {
            id: "modal-product-details",
            title: "Product details",
            description: "More information",
            content: <div>Modal body</div>,
          },
        ]}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("mino:open-modal", {
          detail: { id: "modal-product-details" },
        }),
      );
    });

    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(screen.queryByText("Product details")).not.toBeNull();
    expect(screen.queryByText("Modal body")).not.toBeNull();
  });

  it("ignores unknown Modal IDs", () => {
    render(
      <ModalRegistryClient
        modals={[
          {
            id: "modal-known",
            title: "Known modal",
            content: <div>Known body</div>,
          },
        ]}
      />,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent("mino:open-modal", {
          detail: { id: "modal-unknown" },
        }),
      );
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the active Modal through the Mino close control", () => {
    render(
      <ModalRegistryClient
        modals={[
          {
            id: "modal-known",
            title: "Known modal",
            content: <div>Known body</div>,
          },
        ]}
      />,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent("mino:open-modal", {
          detail: { id: "modal-known" },
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /close modal/i }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
