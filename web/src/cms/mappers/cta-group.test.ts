import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CmsCta, CmsCtaGroup } from "@/cms/types";

const { mapCtasMock } = vi.hoisted(() => ({
  mapCtasMock: vi.fn(),
}));

vi.mock("./cta", () => ({
  mapCtas: mapCtasMock,
}));

import { mapCtaGroup } from "./cta-group";

function asCtas(value: Array<Record<string, unknown>>): CmsCta[] {
  return value as unknown as CmsCta[];
}

beforeEach(() => {
  mapCtasMock.mockReset();
  mapCtasMock.mockResolvedValue([]);
});

describe("mapCtaGroup", () => {
  it("maps the new CTA Group shape and forwards alignment + mobile stacking", async () => {
    const items = asCtas([
      {
        _key: "primary",
        label: "Get started",
      },
    ]);

    mapCtasMock.mockResolvedValueOnce([
      {
        as: "a",
        href: "/get-started",
        label: "Get started",
      },
    ]);

    const group: CmsCtaGroup = {
      items,
      alignment: "right",
      stackOnMobile: false,
    };

    await expect(mapCtaGroup(group)).resolves.toEqual({
      ctas: [
        {
          as: "a",
          href: "/get-started",
          label: "Get started",
        },
      ],
      ctaGroupProps: {
        alignment: "right",
        stackOnMobile: false,
      },
    });

    expect(mapCtasMock).toHaveBeenCalledWith(items);
  });

  it("inherits the containing block alignment when CTA Group alignment is unset", async () => {
    const items = asCtas([
      {
        _key: "primary",
        label: "Learn more",
      },
    ]);

    const group: CmsCtaGroup = {
      items,
    };

    const mapped = await mapCtaGroup(group, {
      fallbackAlignment: "center",
    });

    expect(mapped.ctaGroupProps).toEqual({
      alignment: "center",
      stackOnMobile: true,
    });

    expect(mapCtasMock).toHaveBeenCalledWith(items);
  });

  it("keeps legacy CTA fields working until stored documents are migrated", async () => {
    const legacyItems = asCtas([
      {
        _key: "legacy",
        label: "Legacy CTA",
      },
    ]);

    const mapped = await mapCtaGroup(undefined, {
      legacyItems,
      legacyAlignment: "right",
      legacyStackOnMobile: false,
      fallbackAlignment: "left",
    });

    expect(mapCtasMock).toHaveBeenCalledWith(legacyItems);

    expect(mapped.ctaGroupProps).toEqual({
      alignment: "right",
      stackOnMobile: false,
    });
  });

  it("prefers authored CTA Group values over legacy compatibility fields", async () => {
    const newItems = asCtas([
      {
        _key: "new",
        label: "New CTA",
      },
    ]);

    const legacyItems = asCtas([
      {
        _key: "legacy",
        label: "Legacy CTA",
      },
    ]);

    await mapCtaGroup(
      {
        items: newItems,
        alignment: "center",
        stackOnMobile: true,
      },
      {
        legacyItems,
        legacyAlignment: "right",
        legacyStackOnMobile: false,
      },
    );

    expect(mapCtasMock).toHaveBeenCalledWith(newItems);
  });
});
