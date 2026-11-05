import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_FILE = resolve(process.cwd(), "e2e/.env.e2e");

function unquote(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];

  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * Load e2e/.env.e2e without adding dotenv as another dependency.
 *
 * Existing shell/CI environment variables always win over values in the file.
 */
export function loadE2EEnv(): void {
  if (!existsSync(ENV_FILE)) {
    return;
  }

  const lines = readFileSync(ENV_FILE, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = unquote(rawValue);
  }
}
