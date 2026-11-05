import { describe, expect, it } from "vitest";

import { getAppMessages } from "./messages";

describe("getAppMessages", () => {
  it("returns the English US application bundle", () => {
    const messages = getAppMessages("en-us");

    expect(messages.documentList.clearFilters).toBe("Clear Filters");
    expect(messages.documentList.sortOptions.relevance).toBe("Relevance");
    expect(messages.documentList.sortOptions.newest).toBe("Newest");
    expect(messages.headerUtilities.search).toBe("Search");
    expect(messages.author.articlesWrittenBy).toBe(
      "Articles Written By {name}",
    );
    expect(messages.author.expertiseAndCredentials).toBe(
      "Expertise & Credentials",
    );
    expect(messages.blog.by).toBe("By");
    expect(messages.blog.updated).toBe("Updated");
    expect(messages.blog.reviewedBy).toBe("Reviewed by");
    expect(messages.blog.sources).toBe("Sources");
  });

  it("returns the Spanish US application bundle", () => {
    const messages = getAppMessages("es-us");

    expect(messages.documentList.clearFilters).toBe("Limpiar filtros");
    expect(messages.documentList.next).toBe("Siguiente");
    expect(messages.documentList.sortOptions.relevance).toBe("Relevancia");
    expect(messages.documentList.sortOptions.newest).toBe("Más recientes");
    expect(messages.documentList.sortOptions.oldest).toBe("Más antiguos");
    expect(messages.headerUtilities.search).toBe("Buscar");
    expect(messages.author.articlesWrittenBy).toBe(
      "Artículos escritos por {name}",
    );
    expect(messages.author.expertiseAndCredentials).toBe(
      "Especialización y credenciales",
    );
    expect(messages.blog.by).toBe("Por");
    expect(messages.blog.updated).toBe("Actualizado");
    expect(messages.blog.reviewedBy).toBe("Revisado por");
    expect(messages.blog.sources).toBe("Fuentes");
  });

  it("falls back by language and then to English", () => {
    expect(getAppMessages("es-mx").documentList.previous).toBe("Anterior");
    expect(getAppMessages("de-de").documentList.previous).toBe("Previous");
    expect(getAppMessages("es-mx").blog.sources).toBe("Fuentes");
    expect(getAppMessages("de-de").blog.sources).toBe("Sources");
  });
});
