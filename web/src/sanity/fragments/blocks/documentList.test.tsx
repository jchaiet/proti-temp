import { describe, expect, it } from "vitest";

import { DOCUMENT_LIST_BLOCK_FRAGMENT } from "./documentList";

describe("DOCUMENT_LIST_BLOCK_FRAGMENT", () => {
  it("projects the server-backed controls required by Dynamic Document Lists", () => {
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("sourceMode");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("dynamicContentTypes");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("enableSearch");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("searchPlaceholder");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("requireSearchQuery");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("initialStateText");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("enableFilters");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("filterOptions[]");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("taxonomyFilterGroups[]");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("matchLogic");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("taxonomyFilterTitle");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("taxonomyFilterLogic");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("taxonomyFilterMatchLogic");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain(
      '"kind": coalesce(@->kind, "term")',
    );
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain(
      '"includeInFilters": @->includeInFilters',
    );
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain(
      '"filterTaxonomy": filterTaxonomy[]',
    );
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("enableSorting");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("standardSortOptions");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("customSortOptions[]");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("sortOptions[]");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("enablePagination");
    expect(DOCUMENT_LIST_BLOCK_FRAGMENT).toContain("itemsPerPage");
  });
});
