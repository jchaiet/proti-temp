import { loadE2EEnv } from "./environment";

loadE2EEnv();

export interface E2ERoute {
  name: string;
  path: string;
}

interface RouteDefinition {
  name: string;
  envKey: string;
  fallback?: string;
}

const ROUTE_DEFINITIONS: RouteDefinition[] = [
  {
    name: "home",
    envKey: "E2E_HOME_PATH",
    fallback: "/",
  },
  {
    name: "page",
    envKey: "E2E_PAGE_PATH",
  },
  {
    name: "blog",
    envKey: "E2E_BLOG_PATH",
  },
  {
    name: "author",
    envKey: "E2E_AUTHOR_PATH",
  },
  {
    name: "taxonomy",
    envKey: "E2E_TAXONOMY_PATH",
  },
  {
    name: "search",
    envKey: "E2E_SEARCH_PATH",
  },
  {
    name: "secondary-locale",
    envKey: "E2E_SECONDARY_LOCALE_PATH",
  },
];

function normalizePath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function getE2ERoutes(): E2ERoute[] {
  const routes: E2ERoute[] = [];

  for (const definition of ROUTE_DEFINITIONS) {
    const configured = process.env[definition.envKey] ?? definition.fallback;

    if (!configured) {
      continue;
    }

    const path = normalizePath(configured);

    if (!path) {
      continue;
    }

    routes.push({
      name: definition.name,
      path,
    });
  }

  return routes;
}
