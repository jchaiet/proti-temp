import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import test from "node:test";

import {
  copyScript,
  createTempRepo,
  removeTempRepo,
  runNode,
} from "./test-helpers.mjs";

const SEED_SCRIPT = new URL("./proti-seed.mjs", import.meta.url);

async function writeSeedConfig(repo) {
  await fs.writeFile(
    path.join(repo, "proti.config.json"),
    `${JSON.stringify(
      {
        version: 1,
        projectName: "Acme",
        packageName: "acme",
        sanity: {
          projectId: "abc123",
          dataset: "production",
        },
        site: {
          name: "Acme",
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
      },
      null,
      2,
    )}\n`,
  );
}

async function startMockSanity(handler) {
  const requests = [];

  const server = http.createServer(async (request, response) => {
    let body = "";

    for await (const chunk of request) {
      body += chunk;
    }

    const record = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: body ? JSON.parse(body) : null,
    };

    requests.push(record);
    await handler(record, response, requests);
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

function json(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(value));
}

async function prepare(repo) {
  await copyScript(SEED_SCRIPT, repo, "proti-seed.mjs");
  await writeSeedConfig(repo);
}

function runSeed(repo, baseUrl, args = [], token = "editor-token") {
  return runNode({
    cwd: repo,
    script: "scripts/proti-seed.mjs",
    args,
    env: {
      SANITY_API_WRITE_TOKEN: token,
      PROTI_SANITY_API_BASE_URL: baseUrl,
    },
  });
}

function starterDocuments(overrides = {}) {
  return {
    homepageId: null,
    headerId: null,
    footerId: null,
    navigationSetId: null,
    ...overrides,
  };
}

function siteNavigationDefaults({ references = [], resolved = [] } = {}) {
  return { references, resolved };
}

test("plain seed creates only the configured Site", async () => {
  const repo = await createTempRepo();

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      json(response, 200, { result: null });
      return;
    }

    if (request.url.includes("/data/mutate/")) {
      json(response, 200, { transactionId: "site-create" });
      return;
    }

    json(response, 404, {});
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Created initial Sanity Site: site-acme/);
    assert.doesNotMatch(result.stdout, /Starter content/);
    assert.equal(sanity.requests.length, 2);

    const mutations = sanity.requests[1].body.mutations;
    assert.equal(mutations.length, 1);
    assert.equal(mutations[0].createIfNotExists._type, "site");
    assert.equal(mutations[0].createIfNotExists.canonicalDomain, "localhost");
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("plain seed remains a no-op when the Site exists", async () => {
  const repo = await createTempRepo();

  const sanity = await startMockSanity(async (_request, response) => {
    json(response, 200, {
      result: { _id: "site-acme", canonicalDomain: "localhost" },
    });
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /already exists\. No changes were made\./);
    assert.equal(sanity.requests.length, 1);
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("plain seed backfills a missing canonical domain without overwriting the Site", async () => {
  const repo = await createTempRepo();

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      json(response, 200, { result: { _id: "site-acme" } });
      return;
    }

    if (request.url.includes("/data/mutate/")) {
      json(response, 200, { transactionId: "canonical-backfill" });
      return;
    }

    json(response, 404, {});
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Added missing canonical domain/);
    assert.equal(sanity.requests.length, 2);
    assert.deepEqual(sanity.requests[1].body.mutations, [
      {
        patch: {
          id: "site-acme",
          setIfMissing: {
            canonicalDomain: "localhost",
          },
        },
      },
    ]);
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("--starter-content creates Site, starter documents, and the Site default Navigation assignment", async () => {
  const repo = await createTempRepo();
  let queryCount = 0;

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      queryCount += 1;

      if (queryCount === 1) {
        json(response, 200, { result: null });
      } else if (queryCount === 2) {
        json(response, 200, { result: starterDocuments() });
      } else {
        json(response, 200, { result: siteNavigationDefaults() });
      }

      return;
    }

    if (request.url.includes("/data/mutate/")) {
      json(response, 200, {
        transactionId: `mutation-${sanity.requests.length}`,
      });
      return;
    }

    json(response, 404, {});
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl, ["--starter-content"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Starter content \(en-us\)/);
    assert.match(result.stdout, /Created: Home/);
    assert.match(result.stdout, /Created: Header/);
    assert.match(result.stdout, /Created: Footer/);
    assert.match(result.stdout, /Created: Navigation Set/);
    assert.match(result.stdout, /Assigned: Site default navigation/);

    assert.equal(sanity.requests.length, 6);

    const siteMutation = sanity.requests[1].body.mutations;
    assert.equal(siteMutation.length, 1);
    assert.equal(siteMutation[0].createIfNotExists._type, "site");

    const starterMutations = sanity.requests[4].body.mutations;
    assert.equal(starterMutations.length, 4);

    const documents = starterMutations.map(
      ({ createIfNotExists }) => createIfNotExists,
    );

    const homepage = documents.find(({ _type }) => _type === "page");
    const header = documents.find(({ _type }) => _type === "navigationHeader");
    const footer = documents.find(({ _type }) => _type === "navigationFooter");
    const navigationSet = documents.find(
      ({ _type }) => _type === "navigationSet",
    );

    assert.deepEqual(homepage, {
      _id: "page-acme-en-us-home",
      _type: "page",
      title: "Home",
      site: { _type: "reference", _ref: "site-acme" },
      locale: "en-us",
      isHomepage: true,
      sections: [],
    });

    assert.equal(header.key, "default-header");
    assert.equal(header.locale, "en-us");
    assert.equal(header.logoMode, "site");

    assert.equal(footer.key, "default-footer");
    assert.equal(footer.locale, "en-us");

    assert.equal(navigationSet.key, "default");
    assert.equal("isDefault" in navigationSet, false);
    assert.deepEqual(navigationSet.header, {
      _type: "reference",
      _ref: "navigation-header-acme-en-us-default",
    });
    assert.deepEqual(navigationSet.footer, {
      _type: "reference",
      _ref: "navigation-footer-acme-en-us-default",
    });

    const siteDefaultMutation = sanity.requests[5].body.mutations;
    assert.deepEqual(siteDefaultMutation, [
      {
        patch: {
          id: "site-acme",
          set: {
            defaultNavigationSets: [
              {
                _key: "default-navigation-en-us",
                _type: "reference",
                _ref: "navigation-set-acme-en-us-default",
              },
            ],
          },
        },
      },
    ]);
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("--starter-content can be added after the Site was already seeded", async () => {
  const repo = await createTempRepo();
  let queryCount = 0;

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      queryCount += 1;

      if (queryCount === 1) {
        json(response, 200, {
          result: { _id: "site-acme", canonicalDomain: "localhost" },
        });
      } else if (queryCount === 2) {
        json(response, 200, { result: starterDocuments() });
      } else {
        json(response, 200, { result: siteNavigationDefaults() });
      }

      return;
    }

    json(response, 200, { transactionId: "starter-create" });
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl, ["--starter-content"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Site "site-acme" already exists\./);
    assert.match(result.stdout, /Created: Home/);
    assert.match(result.stdout, /Assigned: Site default navigation/);
    assert.equal(sanity.requests.length, 5);
    assert.equal(sanity.requests[3].body.mutations.length, 4);
    assert.equal(sanity.requests[4].body.mutations[0].patch.id, "site-acme");
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("starter content reuses matching existing documents and never overwrites them", async () => {
  const repo = await createTempRepo();
  let queryCount = 0;

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      queryCount += 1;

      if (queryCount === 1) {
        json(response, 200, {
          result: { _id: "site-acme", canonicalDomain: "localhost" },
        });
      } else if (queryCount === 2) {
        json(response, 200, {
          result: starterDocuments({
            homepageId: "custom-home-id",
            headerId: "custom-header-id",
          }),
        });
      } else {
        json(response, 200, { result: siteNavigationDefaults() });
      }

      return;
    }

    json(response, 200, { transactionId: "partial-create" });
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl, ["--starter-content"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Existing: Home \(custom-home-id\)/);
    assert.match(result.stdout, /Existing: Header \(custom-header-id\)/);

    const starterMutations = sanity.requests[3].body.mutations;
    assert.equal(starterMutations.length, 2);

    const documents = starterMutations.map(
      ({ createIfNotExists }) => createIfNotExists,
    );

    assert.equal(
      documents.some(({ _type }) => _type === "page"),
      false,
    );
    assert.equal(
      documents.some(({ _type }) => _type === "navigationHeader"),
      false,
    );

    const navigationSet = documents.find(
      ({ _type }) => _type === "navigationSet",
    );

    assert.deepEqual(navigationSet.header, {
      _type: "reference",
      _ref: "custom-header-id",
    });
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("starter content preserves existing defaults for other Locales when assigning the default Locale", async () => {
  const repo = await createTempRepo();
  let queryCount = 0;

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      queryCount += 1;

      if (queryCount === 1) {
        json(response, 200, {
          result: { _id: "site-acme", canonicalDomain: "localhost" },
        });
      } else if (queryCount === 2) {
        json(response, 200, {
          result: starterDocuments({
            homepageId: "home-existing",
            headerId: "header-existing",
            footerId: "footer-existing",
            navigationSetId: "navigation-en",
          }),
        });
      } else {
        json(response, 200, {
          result: siteNavigationDefaults({
            references: [
              {
                _key: "default-navigation-es-us",
                _type: "reference",
                _ref: "navigation-es",
              },
            ],
            resolved: [
              {
                _id: "navigation-es",
                locale: "es-us",
              },
            ],
          }),
        });
      }

      return;
    }

    json(response, 200, { transactionId: "site-default-update" });
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl, ["--starter-content"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(
      result.stdout,
      /Assigned: Site default navigation \(navigation-en\)/,
    );

    const patch = sanity.requests[3].body.mutations[0].patch;

    assert.deepEqual(patch.set.defaultNavigationSets, [
      {
        _key: "default-navigation-es-us",
        _type: "reference",
        _ref: "navigation-es",
      },
      {
        _key: "default-navigation-en-us",
        _type: "reference",
        _ref: "navigation-en",
      },
    ]);
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("starter content respects an existing Site default Navigation Set for the default Locale", async () => {
  const repo = await createTempRepo();
  let queryCount = 0;

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      queryCount += 1;

      if (queryCount === 1) {
        json(response, 200, {
          result: { _id: "site-acme", canonicalDomain: "localhost" },
        });
      } else if (queryCount === 2) {
        json(response, 200, {
          result: starterDocuments({
            homepageId: "home-existing",
            headerId: "header-existing",
            footerId: "footer-existing",
          }),
        });
      } else {
        json(response, 200, {
          result: siteNavigationDefaults({
            references: [
              {
                _key: "existing-en-default",
                _type: "reference",
                _ref: "custom-navigation-en",
              },
            ],
            resolved: [
              {
                _id: "custom-navigation-en",
                locale: "en-us",
              },
            ],
          }),
        });
      }

      return;
    }

    json(response, 500, { error: "No mutation expected" });
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl, ["--starter-content"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(
      result.stdout,
      /Existing: Navigation Set \(custom-navigation-en\)/,
    );
    assert.match(
      result.stdout,
      /Existing: Site default navigation \(custom-navigation-en\)/,
    );
    assert.match(
      result.stdout,
      /Starter content already exists\. No changes were made\./,
    );
    assert.equal(sanity.requests.length, 3);
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("starter content is a full no-op when all starter documents and default assignment exist", async () => {
  const repo = await createTempRepo();
  let queryCount = 0;

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      queryCount += 1;

      if (queryCount === 1) {
        json(response, 200, {
          result: { _id: "site-acme", canonicalDomain: "localhost" },
        });
      } else if (queryCount === 2) {
        json(response, 200, {
          result: starterDocuments({
            homepageId: "home-existing",
            headerId: "header-existing",
            footerId: "footer-existing",
            navigationSetId: "navigation-existing",
          }),
        });
      } else {
        json(response, 200, {
          result: siteNavigationDefaults({
            references: [
              {
                _key: "default-navigation-en-us",
                _type: "reference",
                _ref: "navigation-existing",
              },
            ],
            resolved: [
              {
                _id: "navigation-existing",
                locale: "en-us",
              },
            ],
          }),
        });
      }

      return;
    }

    json(response, 500, { error: "No mutation expected" });
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl, ["--starter-content"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(
      result.stdout,
      /Starter content already exists\. No changes were made\./,
    );
    assert.equal(sanity.requests.length, 3);
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("seed explains insufficient Sanity create permission", async () => {
  const repo = await createTempRepo();

  const sanity = await startMockSanity(async (request, response) => {
    if (request.url.includes("/data/query/")) {
      json(response, 200, { result: null });
      return;
    }

    json(response, 403, {
      error: {
        description: 'Insufficient permissions; permission "create" required',
      },
    });
  });

  try {
    await prepare(repo);

    const result = await runSeed(repo, sanity.baseUrl, [], "read-only-token");

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /does not have permission to create documents/);
    assert.match(result.stderr, /Editor-capable token/);
  } finally {
    await sanity.close();
    await removeTempRepo(repo);
  }
});

test("seed rejects unknown flags", async () => {
  const repo = await createTempRepo();

  try {
    await prepare(repo);

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-seed.mjs",
      args: ["--starter"],
      env: {
        SANITY_API_WRITE_TOKEN: "editor-token",
      },
    });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Unknown proti:seed option: --starter/);
  } finally {
    await removeTempRepo(repo);
  }
});
