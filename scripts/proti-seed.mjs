import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const API_VERSION = "2026-08-21";

function parseEnv(source) {
  const values = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const index = line.indexOf("=");

    if (index < 0) {
      continue;
    }

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function localeKey(code) {
  return `locale-${code.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

function documentIdPart(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function reference(id) {
  return {
    _type: "reference",
    _ref: id,
  };
}

function arrayReference(id, key) {
  return {
    _key: key,
    _type: "reference",
    _ref: id,
  };
}

async function readRequiredJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    throw new Error(
      `Unable to read ${path.relative(ROOT, filePath)}. Run "pnpm proti:init" first.`,
    );
  }
}

async function readLocalWebEnv() {
  try {
    return parseEnv(
      await fs.readFile(path.join(ROOT, "web", ".env.local"), "utf8"),
    );
  } catch {
    return {};
  }
}

function getApiBaseUrl(projectId) {
  const override = process.env.PROTI_SANITY_API_BASE_URL?.trim();

  if (override) {
    return override.replace(/\/+$/, "");
  }

  return `https://${projectId}.api.sanity.io`;
}

async function responseError(response) {
  const body = await response.text();

  if (response.status === 401) {
    return new Error(
      "Sanity rejected SANITY_API_WRITE_TOKEN. Verify that the token is valid for this project.",
    );
  }

  if (response.status === 403) {
    return new Error(
      [
        "SANITY_API_WRITE_TOKEN does not have permission to create documents.",
        'Use an Editor-capable token for this Sanity project, update web/.env.local, and run "pnpm proti:seed" again.',
      ].join(" "),
    );
  }

  return new Error(
    `Sanity request failed: ${response.status}${body ? ` ${body}` : ""}`,
  );
}

function parseArguments(argv) {
  const args = new Set(argv);

  if (args.has("--help") || args.has("-h")) {
    console.log(
      `\nProti seed\n\nUsage:\n  pnpm proti:seed\n  pnpm proti:seed --starter-content\n\nOptions:\n  --starter-content  Also create a minimal Home, Header, Footer, and Navigation Set for the default locale.\n`,
    );
    process.exit(0);
  }

  const supported = new Set(["--starter-content"]);
  const unknown = argv.filter((arg) => !supported.has(arg));

  if (unknown.length > 0) {
    throw new Error(
      `Unknown proti:seed option${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`,
    );
  }

  return {
    starterContent: args.has("--starter-content"),
  };
}

async function sanityQuery({ apiBaseUrl, dataset, token, query, params = {} }) {
  const response = await fetch(
    `${apiBaseUrl}/v${API_VERSION}/data/query/${dataset}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        params,
      }),
    },
  );

  if (!response.ok) {
    throw await responseError(response);
  }

  const payload = await response.json();

  return payload.result;
}

async function sanityMutate({ apiBaseUrl, dataset, token, mutations }) {
  if (mutations.length === 0) {
    return;
  }

  const response = await fetch(
    `${apiBaseUrl}/v${API_VERSION}/data/mutate/${dataset}?returnIds=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mutations }),
    },
  );

  if (!response.ok) {
    throw await responseError(response);
  }
}

function buildSiteDocument(site, documentId) {
  return {
    _id: documentId,
    _type: "site",
    name: site.name,
    key: site.key,
    domains: site.domains,
    canonicalDomain: site.canonicalDomain,
    defaultLocale: site.defaultLocale,
    locales: site.locales.map(({ code, label }) => ({
      _key: localeKey(code),
      _type: "siteLocale",
      code,
      label,
    })),
  };
}

function starterIds(siteKey, locale) {
  const scope = `${documentIdPart(siteKey)}-${documentIdPart(locale)}`;

  return {
    homepage: `page-${scope}-home`,
    header: `navigation-header-${scope}-default`,
    footer: `navigation-footer-${scope}-default`,
    navigationSet: `navigation-set-${scope}-default`,
  };
}

function buildStarterDocuments({ siteId, site, existing }) {
  const locale = site.defaultLocale;
  const ids = starterIds(site.key, locale);
  const siteReference = reference(siteId);
  const headerId = existing.headerId || ids.header;
  const footerId = existing.footerId || ids.footer;

  const entries = [
    {
      key: "homepage",
      label: "Home",
      id: existing.homepageId || ids.homepage,
      existingId: existing.homepageId,
      document: {
        _id: ids.homepage,
        _type: "page",
        title: "Home",
        site: siteReference,
        locale,
        isHomepage: true,
        sections: [],
      },
    },
    {
      key: "header",
      label: "Header",
      id: headerId,
      existingId: existing.headerId,
      document: {
        _id: ids.header,
        _type: "navigationHeader",
        title: "Default Header",
        key: "default-header",
        site: siteReference,
        locale,
        logoMode: "site",
        align: "center",
        variant: "standard",
        isSticky: true,
        items: [],
        utilityActions: [],
      },
    },
    {
      key: "footer",
      label: "Footer",
      id: footerId,
      existingId: existing.footerId,
      document: {
        _id: ids.footer,
        _type: "navigationFooter",
        title: "Default Footer",
        key: "default-footer",
        site: siteReference,
        locale,
        logoMode: "site",
        columns: [],
        socialLinks: [],
        legalLinks: [],
      },
    },
    {
      key: "navigationSet",
      label: "Navigation Set",
      id: existing.navigationSetId || ids.navigationSet,
      existingId: existing.navigationSetId,
      document: {
        _id: ids.navigationSet,
        _type: "navigationSet",
        title: "Default Navigation",
        key: "default",
        site: siteReference,
        locale,
        headerMode: "custom",
        header: reference(headerId),
        footerMode: "custom",
        footer: reference(footerId),
      },
    },
  ];

  return entries;
}

async function getSiteNavigationDefaults({
  apiBaseUrl,
  dataset,
  token,
  siteId,
  locale,
}) {
  const value = await sanityQuery({
    apiBaseUrl,
    dataset,
    token,
    query: `*[
      _type == "site" &&
      _id == $siteId
    ][0]{
      "references": coalesce(
        defaultNavigationSets[]{
          _key,
          _type,
          _ref
        },
        []
      ),
      "resolved": coalesce(
        defaultNavigationSets[]->{
          _id,
          locale
        },
        []
      )
    }`,
    params: {
      siteId,
    },
  });

  const references = Array.isArray(value?.references)
    ? value.references.filter(({ _ref }) => Boolean(_ref))
    : [];

  const resolved = Array.isArray(value?.resolved) ? value.resolved : [];

  const defaultForLocale = resolved.find(
    (navigationSet) => navigationSet?.locale === locale,
  );

  return {
    references,
    defaultForLocaleId: defaultForLocale?._id || null,
  };
}

async function assignSiteDefaultNavigation({
  apiBaseUrl,
  dataset,
  token,
  siteId,
  locale,
  navigationSetId,
  references,
}) {
  const nextReferences = [
    ...references,
    arrayReference(
      navigationSetId,
      `default-navigation-${documentIdPart(locale)}`,
    ),
  ];

  await sanityMutate({
    apiBaseUrl,
    dataset,
    token,
    mutations: [
      {
        patch: {
          id: siteId,
          set: {
            defaultNavigationSets: nextReferences,
          },
        },
      },
    ],
  });
}

async function seedStarterContent({
  apiBaseUrl,
  dataset,
  token,
  siteId,
  site,
}) {
  const locale = site.defaultLocale;

  if (!locale) {
    throw new Error(
      'proti.config.json is missing site.defaultLocale. Run "pnpm proti:init" again.',
    );
  }

  if (!site.locales?.some(({ code }) => code === locale)) {
    throw new Error(
      `Default locale "${locale}" must be included in site.locales before starter content can be seeded.`,
    );
  }

  const existing = await sanityQuery({
    apiBaseUrl,
    dataset,
    token,
    query: `{
      "homepageId": *[
        _type == "page" &&
        site._ref == $siteId &&
        locale == $locale &&
        isHomepage == true
      ][0]._id,
      "headerId": *[
        _type == "navigationHeader" &&
        site._ref == $siteId &&
        locale == $locale &&
        key == "default-header"
      ][0]._id,
      "footerId": *[
        _type == "navigationFooter" &&
        site._ref == $siteId &&
        locale == $locale &&
        key == "default-footer"
      ][0]._id,
      "navigationSetId": *[
        _type == "navigationSet" &&
        site._ref == $siteId &&
        locale == $locale &&
        key == "default"
      ][0]._id
    }`,
    params: {
      siteId,
      locale,
    },
  });

  const siteNavigationDefaults = await getSiteNavigationDefaults({
    apiBaseUrl,
    dataset,
    token,
    siteId,
    locale,
  });

  const effectiveExisting = {
    ...(existing ?? {}),
    navigationSetId:
      existing?.navigationSetId || siteNavigationDefaults.defaultForLocaleId,
  };

  const entries = buildStarterDocuments({
    siteId,
    site,
    existing: effectiveExisting,
  });

  const missing = entries.filter(({ existingId }) => !existingId);

  if (missing.length > 0) {
    await sanityMutate({
      apiBaseUrl,
      dataset,
      token,
      mutations: missing.map(({ document }) => ({
        createIfNotExists: document,
      })),
    });
  }

  const navigationSet = entries.find(({ key }) => key === "navigationSet");
  const hasSiteDefaultNavigation = Boolean(
    siteNavigationDefaults.defaultForLocaleId,
  );

  if (!hasSiteDefaultNavigation && navigationSet?.id) {
    await assignSiteDefaultNavigation({
      apiBaseUrl,
      dataset,
      token,
      siteId,
      locale,
      navigationSetId: navigationSet.id,
      references: siteNavigationDefaults.references,
    });
  }

  console.log(`\nStarter content (${locale})`);

  for (const entry of entries) {
    console.log(
      `${entry.existingId ? "Existing" : "Created"}: ${entry.label} (${entry.id})`,
    );
  }

  if (navigationSet?.id) {
    console.log(
      `${hasSiteDefaultNavigation ? "Existing" : "Assigned"}: Site default navigation (${navigationSet.id})`,
    );
  }

  if (missing.length === 0 && hasSiteDefaultNavigation) {
    console.log("Starter content already exists. No changes were made.");
  } else {
    console.log(
      "Starter content seed complete. Existing documents were not overwritten.",
    );
  }
}

const options = parseArguments(process.argv.slice(2));
const config = await readRequiredJson(path.join(ROOT, "proti.config.json"));
const localEnv = await readLocalWebEnv();

/*
 * The shell environment intentionally wins when explicitly provided.
 * This keeps CI/one-off command overrides possible while web/.env.local
 * remains the normal local-development source.
 */
const token =
  process.env.SANITY_API_WRITE_TOKEN || localEnv.SANITY_API_WRITE_TOKEN;

if (!token) {
  throw new Error(
    [
      "SANITY_API_WRITE_TOKEN is required.",
      "Add an Editor-capable token to web/.env.local or provide it to this command's environment.",
    ].join(" "),
  );
}

const projectId = config.sanity?.projectId;
const dataset = config.sanity?.dataset;
const site = config.site;

if (
  !projectId ||
  !dataset ||
  !site?.key ||
  !site?.name ||
  !Array.isArray(site.domains) ||
  !site.canonicalDomain ||
  !site.domains.includes(site.canonicalDomain) ||
  !Array.isArray(site.locales)
) {
  throw new Error(
    'proti.config.json is incomplete. Run "pnpm proti:init" again.',
  );
}

const apiBaseUrl = getApiBaseUrl(projectId);
const siteId = `site-${site.key}`;

const existingSite = await sanityQuery({
  apiBaseUrl,
  dataset,
  token,
  query: `*[_type == "site" && _id == $id][0]{
    _id,
    canonicalDomain
  }`,
  params: {
    id: siteId,
  },
});

let canonicalDomainBackfilled = false;

if (existingSite?._id && !existingSite.canonicalDomain) {
  await sanityMutate({
    apiBaseUrl,
    dataset,
    token,
    mutations: [
      {
        patch: {
          id: siteId,
          setIfMissing: {
            canonicalDomain: site.canonicalDomain,
          },
        },
      },
    ],
  });

  canonicalDomainBackfilled = true;
  console.log(
    `Added missing canonical domain to Site "${siteId}": ${site.canonicalDomain}`,
  );
}

if (existingSite?._id) {
  if (!options.starterContent) {
    if (!canonicalDomainBackfilled) {
      console.log(`Site "${siteId}" already exists. No changes were made.`);
    }

    process.exit(0);
  }

  console.log(`Site "${siteId}" already exists.`);
} else {
  await sanityMutate({
    apiBaseUrl,
    dataset,
    token,
    mutations: [
      {
        createIfNotExists: buildSiteDocument(site, siteId),
      },
    ],
  });

  console.log(`Created initial Sanity Site: ${siteId}`);
  console.log(`Domains: ${site.domains.join(", ")}`);
  console.log(`Canonical domain: ${site.canonicalDomain}`);
  console.log(`Default locale: ${site.defaultLocale}`);
  console.log(`Locales: ${site.locales.map(({ code }) => code).join(", ")}`);
}

if (options.starterContent) {
  await seedStarterContent({
    apiBaseUrl,
    dataset,
    token,
    siteId,
    site,
  });
}
