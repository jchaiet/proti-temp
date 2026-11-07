import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import test from "node:test";

const CHECK_SCRIPT = new URL("./proti-check.mjs", import.meta.url);

function git(repo, ...args) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function createRepo({
  includeTokens = true,
  webProjectId = "abc123",
  gitMode = "fresh",
  remoteUrl,
  withCommit = false,
  visualBaselines = "both",
} = {}) {
  const tempRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "proti-check-test-"),
  );
  const repo =
    gitMode === "parent" ? path.join(tempRoot, "generated-site") : tempRoot;

  if (gitMode === "parent") {
    git(tempRoot, "init", "--quiet", "--initial-branch=main");
  }

  await Promise.all([
    fs.mkdir(path.join(repo, "scripts"), {
      recursive: true,
    }),
    fs.mkdir(path.join(repo, "web"), {
      recursive: true,
    }),
    fs.mkdir(path.join(repo, "studio"), {
      recursive: true,
    }),
  ]);

  await fs.copyFile(
    CHECK_SCRIPT,
    path.join(repo, "scripts", "proti-check.mjs"),
  );

  const config = {
    version: 1,
    projectName: "Acme Health",
    packageName: "acme-health",
    sanity: {
      projectId: "abc123",
      dataset: "production",
      studioUrl: "http://localhost:3333",
      previewUrl: "http://localhost:3000",
    },
    site: {
      name: "Acme Health",
      key: "acme",
      domains: ["localhost", "example.com"],
      canonicalDomain: "localhost",
      defaultLocale: "en-us",
      locales: [
        {
          code: "en-us",
          label: "English (US)",
        },
        {
          code: "es-us",
          label: "Spanish (US)",
        },
      ],
    },
  };

  await fs.writeFile(
    path.join(repo, "proti.config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
  );

  await fs.writeFile(
    path.join(repo, "package.json"),
    JSON.stringify({
      name: "acme-health",
      private: true,
    }),
  );

  await fs.writeFile(
    path.join(repo, "web", "package.json"),
    JSON.stringify({
      name: "acme-health-web",
      private: true,
    }),
  );

  await fs.writeFile(
    path.join(repo, "studio", "package.json"),
    JSON.stringify({
      name: "acme-health-studio",
      private: true,
    }),
  );

  const tokenLines = includeTokens
    ? [
        "SANITY_API_READ_TOKEN=read-token",
        "SANITY_API_WRITE_TOKEN=write-token",
        "SANITY_REVALIDATE_SECRET=revalidate-secret",
      ]
    : [
        "SANITY_API_READ_TOKEN=",
        "SANITY_API_WRITE_TOKEN=",
        "SANITY_REVALIDATE_SECRET=",
      ];

  await fs.writeFile(
    path.join(repo, "web", ".env.local"),
    [
      `NEXT_SANITY_PROJECT_ID=${webProjectId}`,
      "NEXT_SANITY_DATASET=production",
      "NEXT_SANITY_STUDIO_URL=http://localhost:3333",
      ...tokenLines,
      "",
    ].join("\n"),
  );

  await fs.writeFile(
    path.join(repo, "studio", ".env.local"),
    [
      "SANITY_STUDIO_PROJECT_ID=abc123",
      "SANITY_STUDIO_DATASET=production",
      "SANITY_STUDIO_TITLE=Acme Health",
      "SANITY_STUDIO_PREVIEW_URL=http://localhost:3000",
      "",
    ].join("\n"),
  );

  // Healthy generated projects have their own desktop and mobile baselines.
  // Missing baselines should warn rather than block early project setup.
  if (visualBaselines !== "none") {
    const projectNames =
      visualBaselines === "desktop-only"
        ? ["chromium-desktop"]
        : ["chromium-desktop", "chromium-mobile"];
    for (const project of projectNames) {
      const directory = path.join(
        repo,
        "web",
        "e2e",
        "__screenshots__",
        project,
      );
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, "home.png"), "fixture baseline");
    }
  }

  // A generated Proti project starts with its own Git repository and no
  // inherited remote. Tests may deliberately select other Git states.
  if (gitMode === "fresh") {
    git(repo, "init", "--quiet", "--initial-branch=main");

    if (remoteUrl) {
      git(repo, "remote", "add", "origin", remoteUrl);
    }

    if (withCommit) {
      await fs.writeFile(
        path.join(repo, "fixture.txt"),
        "First project commit\n",
      );
      git(repo, "add", "fixture.txt");
      git(
        repo,
        "-c",
        "user.name=Proti Test",
        "-c",
        "user.email=proti-test@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "Initial project commit",
      );
    }
  }

  return {
    repo,
    config,
    cleanupRoot: tempRoot,
  };
}

async function removeRepo(repo) {
  await fs.rm(repo, {
    recursive: true,
    force: true,
  });
}

function runCheck({ repo, baseUrl }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/proti-check.mjs"], {
      cwd: repo,
      env: {
        ...process.env,
        SANITY_API_READ_TOKEN: "",
        SANITY_API_WRITE_TOKEN: "",
        PROTI_SANITY_API_BASE_URL: baseUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
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
  });
}

async function startSanity({ site, status = 200 } = {}) {
  const requests = [];

  const server = http.createServer(async (request, response) => {
    let body = "";

    for await (const chunk of request) {
      body += chunk;
    }

    requests.push({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: body ? JSON.parse(body) : null,
    });

    response.writeHead(status, {
      "Content-Type": "application/json",
    });

    response.end(
      JSON.stringify(
        status === 200
          ? {
              result:
                site === undefined
                  ? {
                      _id: "site-acme",
                      _type: "site",
                      name: "Acme Health",
                      key: "acme",
                      domains: ["localhost", "example.com"],
                      canonicalDomain: "localhost",
                      defaultLocale: "en-us",
                      locales: [
                        {
                          code: "en-us",
                          label: "English (US)",
                        },
                        {
                          code: "es-us",
                          label: "Spanish (US)",
                        },
                      ],
                    }
                  : site,
            }
          : {
              error: {
                description: "Request failed",
              },
            },
      ),
    );
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  return {
    requests,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }),
  };
}

test("healthy setup passes", async () => {
  const { repo } = await createRepo();

  const sanity = await startSanity();

  try {
    const result = await runCheck({
      repo,
      baseUrl: sanity.baseUrl,
    });

    assert.equal(result.code, 0, result.stderr);

    assert.match(
      result.stdout,
      /✓ Git repository — Initialized in this project/,
    );

    assert.match(result.stdout, /✓ Git independence — No remote configured/);

    assert.match(result.stdout, /✓ Project configuration/);

    assert.match(result.stdout, /✓ Sanity Site — site-acme/);

    assert.match(result.stdout, /✓ Default locale — en-us/);

    assert.match(result.stdout, /✓ Supported locales — en-us, es-us/);

    assert.match(result.stdout, /Proti is ready\./);

    assert.equal(sanity.requests.length, 1);

    assert.equal(sanity.requests[0].headers.authorization, "Bearer read-token");
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("environment mismatch fails", async () => {
  const { repo } = await createRepo({
    webProjectId: "wrong123",
  });

  const sanity = await startSanity();

  try {
    const result = await runCheck({
      repo,
      baseUrl: sanity.baseUrl,
    });

    assert.notEqual(result.code, 0);

    assert.match(result.stdout, /✗ Web Sanity project/);

    assert.match(result.stdout, /Expected "abc123", found "wrong123"/);

    assert.match(result.stdout, /Proti setup has 1 problem/);
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("missing Site fails with seed guidance", async () => {
  const { repo } = await createRepo();

  const sanity = await startSanity({
    site: null,
  });

  try {
    const result = await runCheck({
      repo,
      baseUrl: sanity.baseUrl,
    });

    assert.notEqual(result.code, 0);

    assert.match(result.stdout, /✗ Sanity Site/);

    assert.match(result.stdout, /Run "pnpm proti:seed"/);
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("CMS drift is reported as a warning", async () => {
  const { repo } = await createRepo();

  const sanity = await startSanity({
    site: {
      _id: "site-acme",
      _type: "site",
      name: "Acme Health",
      key: "acme",
      domains: ["localhost", "new.example.com"],
      canonicalDomain: "localhost",
      defaultLocale: "en-us",
      locales: [
        {
          code: "en-us",
          label: "English (US)",
        },
        {
          code: "es-us",
          label: "Spanish (US)",
        },
      ],
    },
  });

  try {
    const result = await runCheck({
      repo,
      baseUrl: sanity.baseUrl,
    });

    assert.equal(result.code, 0, result.stderr);

    assert.match(result.stdout, /! Site domains/);

    assert.match(result.stdout, /Proti is ready with 1 warning/);
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("missing operational secrets warn without blocking a public dataset", async () => {
  const { repo } = await createRepo({
    includeTokens: false,
  });

  const sanity = await startSanity();

  try {
    const result = await runCheck({
      repo,
      baseUrl: sanity.baseUrl,
    });

    assert.equal(result.code, 0, result.stderr);

    assert.match(result.stdout, /! Read token/);

    assert.match(result.stdout, /! Write token/);

    assert.match(result.stdout, /! Revalidation secret/);

    assert.match(result.stdout, /Proti is ready with 3 warnings/);
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("fresh Git repository without commits is accepted", async () => {
  const { repo } = await createRepo();
  const sanity = await startSanity();

  try {
    // The freshly generated project is still allowed to be uncommitted.
    assert.equal(git(repo, "branch", "--show-current"), "main");

    const result = await runCheck({ repo, baseUrl: sanity.baseUrl });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /✓ Git repository/);
    assert.match(result.stdout, /✓ Git independence — No remote configured/);
    assert.match(result.stdout, /Proti is ready\./);
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("custom GitHub remote and existing commit are preserved", async () => {
  const customRemote = "git@github.com:acme/acme-health.git";
  const { repo } = await createRepo({
    remoteUrl: customRemote,
    withCommit: true,
  });
  const sanity = await startSanity();

  try {
    const originalCommit = git(repo, "rev-parse", "HEAD");
    const result = await runCheck({ repo, baseUrl: sanity.baseUrl });

    assert.equal(result.code, 0, result.stderr);
    assert.match(
      result.stdout,
      /✓ Git independence — No inherited proti-demo remote/,
    );
    assert.equal(git(repo, "remote", "get-url", "origin"), customRemote);
    assert.equal(git(repo, "rev-parse", "HEAD"), originalCommit);
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("inherited proti-demo origin is rejected", async () => {
  const { repo } = await createRepo({
    remoteUrl: "git@github.com:example/proti-demo.git",
  });
  const sanity = await startSanity();

  try {
    const result = await runCheck({ repo, baseUrl: sanity.baseUrl });

    assert.notEqual(result.code, 0);
    assert.match(
      result.stdout,
      /✗ Git independence — Inherited proti-demo remote detected \(origin\)/,
    );
    assert.match(result.stdout, /git remote remove/);
    assert.match(result.stdout, /Proti setup has 1 problem/);
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("inherited proti-demo remote is rejected even when named upstream", async () => {
  const { repo } = await createRepo();
  git(
    repo,
    "remote",
    "add",
    "upstream",
    "https://github.com/example/proti-demo.git",
  );
  const sanity = await startSanity();

  try {
    const result = await runCheck({ repo, baseUrl: sanity.baseUrl });

    assert.notEqual(result.code, 0);
    assert.match(
      result.stdout,
      /Inherited proti-demo remote detected \(upstream\)/,
    );
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("inherited proti-demo push URL is rejected even with an independent fetch URL", async () => {
  const { repo } = await createRepo({
    remoteUrl: "https://github.com/acme/acme-health.git",
  });
  git(
    repo,
    "remote",
    "set-url",
    "--push",
    "origin",
    "https://github.com/example/proti-demo.git",
  );
  const sanity = await startSanity();

  try {
    const result = await runCheck({ repo, baseUrl: sanity.baseUrl });

    assert.notEqual(result.code, 0);
    assert.match(
      result.stdout,
      /Inherited proti-demo remote detected \(origin\)/,
    );
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("missing Git repository fails with initialization guidance", async () => {
  const { repo } = await createRepo({ gitMode: "none" });
  const sanity = await startSanity();

  try {
    const result = await runCheck({ repo, baseUrl: sanity.baseUrl });

    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /✗ Git repository — No Git repository found/);
    assert.match(result.stdout, /pnpm proti:init/);
    assert.match(result.stdout, /Proti setup has 1 problem/);
  } finally {
    await sanity.close();
    await removeRepo(repo);
  }
});

test("Git repository initialized only in a parent directory fails", async () => {
  const { repo, cleanupRoot } = await createRepo({ gitMode: "parent" });
  const sanity = await startSanity();

  try {
    const result = await runCheck({ repo, baseUrl: sanity.baseUrl });

    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /✗ Git repository — Repository root is/);
    assert.match(result.stdout, /not the current project/);
    assert.match(result.stdout, /Proti setup has 1 problem/);
  } finally {
    await sanity.close();
    await removeRepo(cleanupRoot);
  }
});

test("missing visual baselines warn without failing project setup", async () => {
  const { repo, cleanupRoot } = await createRepo({ visualBaselines: "none" });
  const sanity = await startSanity();
  try {
    const result = await runCheck({ repo, baseUrl: sanity.baseUrl });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /! Visual baselines/);
    assert.match(result.stdout, /chromium-desktop/);
    assert.match(result.stdout, /chromium-mobile/);
    assert.match(result.stdout, /pnpm proti:visual:init/);
    assert.match(result.stdout, /Proti is ready with 1 warning/);
  } finally {
    await sanity.close();
    await removeRepo(cleanupRoot);
  }
});

test("incomplete visual baselines warn and identify the missing project", async () => {
  const { repo, cleanupRoot } = await createRepo({
    visualBaselines: "desktop-only",
  });
  const sanity = await startSanity();
  try {
    const result = await runCheck({ repo, baseUrl: sanity.baseUrl });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /! Visual baselines/);
    assert.match(result.stdout, /chromium-mobile/);
    assert.match(result.stdout, /Proti is ready with 1 warning/);
  } finally {
    await sanity.close();
    await removeRepo(cleanupRoot);
  }
});
