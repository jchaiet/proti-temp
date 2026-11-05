import type { AppMessages } from "./types";

export const esUsMessages: AppMessages = {
  documentList: {
    documentFilters: "Filtros de documentos",
    filterOptions: "Opciones de filtro",
    clearFilters: "Limpiar filtros",
    sortDocuments: "Ordenar documentos",
    loadingDocuments: "Cargando documentos.",
    loadingItems: "Cargando elementos...",
    resultStatusSingular: "{count} documento disponible.",
    resultStatusPlural: "{count} documentos disponibles.",
    pagination: "Paginación",
    previous: "Anterior",
    next: "Siguiente",
    pageInfo: "Página {currentPage} de {totalPages}",
    pageInfoWithTotal:
      "Página {currentPage} de {totalPages} ({totalResults} en total)",
    sortOptions: {
      relevance: "Relevancia",
      newest: "Más recientes",
      oldest: "Más antiguos",
      "title-asc": "Título A–Z",
      "title-desc": "Título Z–A",
    },
  },
  headerUtilities: {
    search: "Buscar",
    currentLanguage: "Idioma actual: {language}. Elegir idioma",
    availableLanguages: "Idiomas disponibles",
  },
  blog: {
    by: "Por",
    editorialInformation: "Información editorial del artículo",
    updated: "Actualizado",
    reviewedBy: "Revisado por",
    reviewedOn: "el",
    sources: "Fuentes",
  },
  author: {
    articlesWrittenBy: "Artículos escritos por {name}",
    noPublishedArticles: "Aún no hay artículos publicados por {name}.",
    expertiseAndCredentials: "Especialización y credenciales",
    areasOfExpertise: "Especialización",
    credentials: "Credenciales",
    affiliation: "Afiliación",
    website: "Sitio web",
  },
};
