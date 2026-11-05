import { describe, expect, it } from "vitest";

import { mapSectionHeading } from "./section-heading";

describe("mapSectionHeading", () => {
  it("maps an explicit text alignment independently of block placement", () => {
    expect(
      mapSectionHeading({
        textAlignment: "left",
      }).textAlignment,
    ).toBe("left");
  });

  it("omits text alignment when the author selects block default", () => {
    expect(
      mapSectionHeading({
        textAlignment: "inherit",
      }).textAlignment,
    ).toBeUndefined();
  });
});
