import { describe, expect, it } from "vitest";

import {
  parseSearchParams,
  searchParamRecordToUrlSearchParams,
} from "./params";

describe("parseSearchParams", () => {
  it("returns safe defaults", () => {
    expect(parseSearchParams(new URLSearchParams())).toEqual({
      query: "",
      page: 1,
      pageSize: 12,
      types: ["page", "blog"],
      taxonomy: [],
      taxonomyMatch: "any",
      sort: "relevance",
    });
  });

  it("trims query text and parses filters", () => {
    const params = new URLSearchParams(
      "q=%20nutrition%20&page=2&pageSize=20&type=blog&pageSize=20&taxonomy=food,health&taxonomy=wellness&taxonomyMatch=all&sort=newest",
    );

    expect(parseSearchParams(params)).toEqual({
      query: "nutrition",
      page: 2,
      pageSize: 20,
      types: ["blog"],
      taxonomy: ["food", "health", "wellness"],
      taxonomyMatch: "all",
      sort: "newest",
    });
  });

  it("caps pageSize at 50 and rejects invalid values", () => {
    expect(
      parseSearchParams(
        new URLSearchParams(
          "page=-3&pageSize=999&type=unknown&taxonomyMatch=nope&sort=nope",
        ),
      ),
    ).toEqual({
      query: "",
      page: 1,
      pageSize: 50,
      types: ["page", "blog"],
      taxonomy: [],
      taxonomyMatch: "any",
      sort: "relevance",
    });
  });

  it("accepts every Dynamic Document List content type", () => {
    const result = parseSearchParams(
      new URLSearchParams("type=page,article,blog,news,resource"),
    );

    expect(result.types).toEqual([
      "page",
      "article",
      "blog",
      "news",
      "resource",
    ]);
  });

  it("deduplicates content types and taxonomy values", () => {
    const result = parseSearchParams(
      new URLSearchParams(
        "type=page,blog,page&taxonomy=nutrition&taxonomy=nutrition",
      ),
    );

    expect(result.types).toEqual(["page", "blog"]);
    expect(result.taxonomy).toEqual(["nutrition"]);
  });
});

describe("searchParamRecordToUrlSearchParams", () => {
  it("preserves repeated parameters", () => {
    const params = searchParamRecordToUrlSearchParams({
      q: "nutrition",
      taxonomy: ["food", "health"],
      page: "2",
    });

    expect(params.get("q")).toBe("nutrition");
    expect(params.getAll("taxonomy")).toEqual(["food", "health"]);
    expect(params.get("page")).toBe("2");
  });
});
