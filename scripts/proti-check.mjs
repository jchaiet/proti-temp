import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const API_VERSION = "2026-08-21";

const results = [];

function pass(label, detail = "") {
  results.push({ level: "pass", label, detail });
}

function warn(label, detail = "") {
  results.push({ level: "warn", label, detail });
}

function fail(label, detail = "") {
  results.push({ level: "fail", label, detail });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  try {
    return {
      ok: true,
      value: JSON.parse(await fs.readFile(filePath, "utf8")),
    };
  } catch (error) {
    return {
      ok: false,
      error,
    };
  }
}

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

async function readEnv(filePath) {
  try {
    return {
      ok: true,
      value: parseEnv(await fs.readFile(filePath, "utf8")),
    };
  } catch (error) {
    return {
      ok: false,
      error,
    };
  }
}

function normalizeList(values) {
  return [...values].map(String).sort();
}

function arraysEqual(left, right) {
  const a = normalizeList(left);
  const b = normalizeList(right);

  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizeDomain(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function normalizeLocales(locales) {
  return (Array.isArray(locales) ? locales : [])
    .map(({ code, label }) => `${code}:${label ?? ""}`)
    .sort();
}

function getApiBaseUrl(projectId) {
  const override = process.env.PROTI_SANITY_API_BASE_URL?.trim();

  if (override) {
    return override.replace(/\/+$/, "");
  }

  return `https://${projectId}.api.sanity.io`;
}

function validateConfig(config) {
  let valid = true;

  const requiredStrings = [
    ["projectName", config.projectName],
    ["packageName", config.packageName],
    ["sanity.projectId", config.sanity?.projectId],
    ["sanity.dataset", config.sanity?.dataset],
    ["sanity.studioUrl", config.sanity?.studioUrl],
    ["sanity.previewUrl", config.sanity?.previewUrl],
    ["site.name", config.site?.name],
    ["site.key", config.site?.key],
    ["site.canonicalDomain", config.site?.canonicalDomain],
    ["site.defaultLocale", config.site?.defaultLocale],
  ];

  for (const [field, value] of requiredStrings) {
    if (typeof value !== "string" || value.trim() === "") {
      fail("Project configuration", `Missing ${field} in proti.config.json.`);

      valid = false;
    }
  }

  if (
    !Array.isArray(config.site?.domains) ||
    config.site.domains.length === 0
  ) {
    fail(
      "Project configuration",
      "site.domains must contain at least one domain.",
    );

    valid = false;
  }

  if (
    Array.isArray(config.site?.domains) &&
    config.site.domains.length > 0 &&
    typeof config.site?.canonicalDomain === "string" &&
    config.site.canonicalDomain.trim() &&
    !config.site.domains.some(
      (domain) =>
        normalizeDomain(domain) ===
        normalizeDomain(config.site.canonicalDomain),
    )
  ) {
    fail(
      "Project configuration",
      "site.canonicalDomain must be one of site.domains.",
    );

    valid = false;
  }

  if (
    !Array.isArray(config.site?.locales) ||
    config.site.locales.length === 0
  ) {
    fail(
      "Project configuration",
      "site.locales must contain at least one locale.",
    );

    valid = false;
  } else {
    for (const locale of config.site.locales) {
      if (
        typeof locale?.code !== "string" ||
        !/^[a-z]{2,3}-[a-z]{2}$/.test(locale.code)
      ) {
        fail(
          "Project configuration",
          `Invalid locale code "${locale?.code ?? ""}". Use language-region format, e.g. en-us.`,
        );

        valid = false;
      }
    }

    if (
      !config.site.locales.some(
        ({ code }) => code === config.site.defaultLocale,
      )
    ) {
      fail(
        "Project configuration",
        `Default locale "${config.site.defaultLocale}" is not included in site.locales.`,
      );

      valid = false;
    }
  }

  if (valid) {
    pass("Project configuration", "proti.config.json is valid.");
  }

  return valid;
}

function checkEnvValue({ label, actual, expected }) {
  if (actual === expected) {
    pass(label, expected);

    return;
  }

  fail(label, `Expected "${expected}", found "${actual ?? ""}".`);
}

async function checkPackageName(relativePath, expectedName, label) {
  const filePath = path.join(ROOT, relativePath, "package.json");

  const packageResult = await readJson(filePath);

  if (!packageResult.ok) {
    fail(label, `Unable to read ${path.relative(ROOT, filePath)}.`);

    return;
  }

  if (packageResult.value.name !== expectedName) {
    fail(
      label,
      `Expected "${expectedName}", found "${packageResult.value.name ?? ""}".`,
    );

    return;
  }

  pass(label, expectedName);
}

async function checkSanitySite({ config, webEnv }) {
  const projectId = config.sanity.projectId;
  const dataset = config.sanity.dataset;
  const documentId = `site-${config.site.key}`;

  const token =
    process.env.SANITY_API_READ_TOKEN ||
    webEnv.SANITY_API_READ_TOKEN ||
    process.env.SANITY_API_WRITE_TOKEN ||
    webEnv.SANITY_API_WRITE_TOKEN ||
    "";

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url =
    `${getApiBaseUrl(projectId)}` + `/v${API_VERSION}/data/query/${dataset}`;

  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `*[_type == "site" && _id == $id][0]{
          _id,
          name,
          key,
          domains,
          canonicalDomain,
          defaultLocale,
          locales[]{code, label}
        }`,
        params: {
          id: documentId,
        },
      }),
    });
  } catch (error) {
    fail(
      "Sanity connectivity",
      error instanceof Error
        ? error.message
        : "Unable to reach the Sanity API.",
    );

    return;
  }

  if (!response.ok) {
    const body = await response.text();

    if (response.status === 401) {
      fail(
        "Sanity connectivity",
        "Authentication failed. Check SANITY_API_READ_TOKEN.",
      );

      return;
    }

    if (response.status === 403) {
      fail(
        "Sanity connectivity",
        "The configured token cannot read this dataset.",
      );

      return;
    }

    fail(
      "Sanity connectivity",
      `Sanity returned ${response.status}${body ? `: ${body}` : ""}`,
    );

    return;
  }

  pass("Sanity connectivity", `${projectId}/${dataset}`);

  const payload = await response.json();
  const site = payload.result;

  if (!site) {
    fail(
      "Sanity Site",
      `"${documentId}" was not found. Run "pnpm proti:seed".`,
    );

    return;
  }

  pass("Sanity Site", documentId);

  if (site.name !== config.site.name) {
    warn(
      "Site name",
      `Sanity has "${site.name}", config has "${config.site.name}".`,
    );
  } else {
    pass("Site name", site.name);
  }

  if (site.key !== config.site.key) {
    fail(
      "Site key",
      `Sanity has "${site.key}", config has "${config.site.key}".`,
    );
  } else {
    pass("Site key", site.key);
  }

  if (arraysEqual(site.domains ?? [], config.site.domains)) {
    pass("Site domains", normalizeList(config.site.domains).join(", "));
  } else {
    warn(
      "Site domains",
      `Sanity: ${normalizeList(site.domains ?? []).join(", ") || "(none)"}; config: ${normalizeList(config.site.domains).join(", ")}.`,
    );
  }

  if (
    normalizeDomain(site.canonicalDomain) ===
    normalizeDomain(config.site.canonicalDomain)
  ) {
    pass("Canonical domain", config.site.canonicalDomain);
  } else {
    fail(
      "Canonical domain",
      `Sanity has "${site.canonicalDomain ?? ""}", config has "${config.site.canonicalDomain}".`,
    );
  }

  if (site.defaultLocale === config.site.defaultLocale) {
    pass("Default locale", config.site.defaultLocale);
  } else {
    warn(
      "Default locale",
      `Sanity: "${site.defaultLocale ?? ""}"; config: "${config.site.defaultLocale}".`,
    );
  }

  const sanityLocales = normalizeLocales(site.locales);
  const configLocales = normalizeLocales(config.site.locales);

  if (arraysEqual(sanityLocales, configLocales)) {
    pass(
      "Supported locales",
      config.site.locales.map(({ code }) => code).join(", "),
    );
  } else {
    warn(
      "Supported locales",
      `Sanity: ${sanityLocales.join(", ") || "(none)"}; config: ${configLocales.join(", ")}.`,
    );
  }
}

function printResults() {
  console.log("\nProti setup check\n");

  for (const result of results) {
    const symbol =
      result.level === "pass" ? "✓" : result.level === "warn" ? "!" : "✗";

    console.log(
      `${symbol} ${result.label}${result.detail ? ` — ${result.detail}` : ""}`,
    );
  }

  const failures = results.filter(({ level }) => level === "fail").length;

  const warnings = results.filter(({ level }) => level === "warn").length;

  console.log("");

  if (failures > 0) {
    console.log(
      `Proti setup has ${failures} problem${failures === 1 ? "" : "s"}${warnings ? ` and ${warnings} warning${warnings === 1 ? "" : "s"}` : ""}.`,
    );

    process.exitCode = 1;

    return;
  }

  if (warnings > 0) {
    console.log(
      `Proti is ready with ${warnings} warning${warnings === 1 ? "" : "s"}.`,
    );

    return;
  }

  console.log("Proti is ready.");
}

const configPath = path.join(ROOT, "proti.config.json");

if (!(await fileExists(configPath))) {
  fail(
    "Project configuration",
    'proti.config.json is missing. Run "pnpm proti:init".',
  );

  printResults();
} else {
  const configResult = await readJson(configPath);

  if (!configResult.ok) {
    fail("Project configuration", "proti.config.json is not valid JSON.");

    printResults();
  } else {
    const config = configResult.value;
    const configValid = validateConfig(config);

    const webEnvPath = path.join(ROOT, "web", ".env.local");

    const studioEnvPath = path.join(ROOT, "studio", ".env.local");

    const webEnvResult = await readEnv(webEnvPath);

    const studioEnvResult = await readEnv(studioEnvPath);

    const webEnv = webEnvResult.ok ? webEnvResult.value : {};

    const studioEnv = studioEnvResult.ok ? studioEnvResult.value : {};

    if (!webEnvResult.ok) {
      fail(
        "Web environment",
        'web/.env.local is missing. Run "pnpm proti:init".',
      );
    } else {
      pass("Web environment", "web/.env.local");
    }

    if (!studioEnvResult.ok) {
      fail(
        "Studio environment",
        'studio/.env.local is missing. Run "pnpm proti:init".',
      );
    } else {
      pass("Studio environment", "studio/.env.local");
    }

    if (configValid && webEnvResult.ok) {
      checkEnvValue({
        label: "Web Sanity project",
        actual: webEnv.NEXT_SANITY_PROJECT_ID,
        expected: config.sanity.projectId,
      });

      checkEnvValue({
        label: "Web Sanity dataset",
        actual: webEnv.NEXT_SANITY_DATASET,
        expected: config.sanity.dataset,
      });

      checkEnvValue({
        label: "Studio URL",
        actual: webEnv.NEXT_SANITY_STUDIO_URL,
        expected: config.sanity.studioUrl,
      });

      if (webEnv.SANITY_API_READ_TOKEN) {
        pass("Read token", "Configured.");
      } else {
        warn(
          "Read token",
          "SANITY_API_READ_TOKEN is not set; Draft Mode/Visual Editing may not work.",
        );
      }

      if (webEnv.SANITY_API_WRITE_TOKEN) {
        pass("Write token", "Configured.");
      } else {
        warn(
          "Write token",
          "SANITY_API_WRITE_TOKEN is not set; proti:seed cannot write.",
        );
      }

      if (webEnv.SANITY_REVALIDATE_SECRET) {
        pass("Revalidation secret", "Configured.");
      } else {
        warn(
          "Revalidation secret",
          "SANITY_REVALIDATE_SECRET is not set; revalidation webhook verification will not work.",
        );
      }
    }

    if (configValid && studioEnvResult.ok) {
      checkEnvValue({
        label: "Studio Sanity project",
        actual: studioEnv.SANITY_STUDIO_PROJECT_ID,
        expected: config.sanity.projectId,
      });

      checkEnvValue({
        label: "Studio Sanity dataset",
        actual: studioEnv.SANITY_STUDIO_DATASET,
        expected: config.sanity.dataset,
      });

      checkEnvValue({
        label: "Studio title",
        actual: studioEnv.SANITY_STUDIO_TITLE,
        expected: config.projectName,
      });

      checkEnvValue({
        label: "Preview URL",
        actual: studioEnv.SANITY_STUDIO_PREVIEW_URL,
        expected: config.sanity.previewUrl,
      });
    }

    if (configValid) {
      await checkPackageName("", config.packageName, "Root package");

      await checkPackageName("web", `${config.packageName}-web`, "Web package");

      await checkPackageName(
        "studio",
        `${config.packageName}-studio`,
        "Studio package",
      );

      await checkSanitySite({
        config,
        webEnv,
      });
    }

    printResults();
  }
}
