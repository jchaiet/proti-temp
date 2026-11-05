import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export async function createTempRepo() {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "proti-setup-test-"));

  await Promise.all([
    fs.mkdir(path.join(repo, "scripts"), { recursive: true }),
    fs.mkdir(path.join(repo, "web"), { recursive: true }),
    fs.mkdir(path.join(repo, "studio"), { recursive: true }),
  ]);

  await Promise.all([
    fs.writeFile(
      path.join(repo, "package.json"),
      `${JSON.stringify({ name: "proti", private: true }, null, 2)}\n`,
    ),
    fs.writeFile(
      path.join(repo, "web", "package.json"),
      `${JSON.stringify({ name: "web", private: true }, null, 2)}\n`,
    ),
    fs.writeFile(
      path.join(repo, "studio", "package.json"),
      `${JSON.stringify({ name: "studio", private: true }, null, 2)}\n`,
    ),
  ]);

  return repo;
}

export async function copyScript(source, repo, name) {
  await fs.copyFile(source, path.join(repo, "scripts", name));
}

export async function removeTempRepo(repo) {
  await fs.rm(repo, {
    recursive: true,
    force: true,
  });
}

export function runNode({ cwd, script, args = [], input = "", env = {} }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({
        code,
        stdout,
        stderr,
      });
    });

    child.stdin.end(input);
  });
}

export function scriptedInput(values) {
  return `${values.join("\n")}\n`;
}
