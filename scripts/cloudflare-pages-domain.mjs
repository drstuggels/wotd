#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const action = process.argv[2] ?? "create";
const projectName = process.env.PROJECT_NAME || "wotd";
const domain = process.env.DOMAIN || process.env.CUSTOM_DOMAIN || "";
const apiToken = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getAccountId() {
  const configuredAccountId =
    process.env.ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    "";

  if (configuredAccountId) {
    return configuredAccountId;
  }

  let whoami;
  try {
    whoami = execFileSync("pnpm", ["exec", "wrangler", "whoami", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    fail(
      "Missing account id. Run `make cf-login` or set ACCOUNT_ID, CF_ACCOUNT_ID, or CLOUDFLARE_ACCOUNT_ID.",
    );
  }

  const accounts = JSON.parse(whoami).accounts ?? [];
  if (accounts.length === 1) {
    return accounts[0].id;
  }

  if (!accounts.length) {
    fail("No Cloudflare accounts found. Run `make cf-login` first.");
  }

  console.error("Multiple Cloudflare accounts found. Set one of:");
  console.error("  ACCOUNT_ID=...");
  console.error("  CF_ACCOUNT_ID=...");
  console.error("  CLOUDFLARE_ACCOUNT_ID=...");
  console.error("");
  for (const account of accounts) {
    console.error(`  ${account.name}: ${account.id}`);
  }
  process.exit(1);
}

async function request(method, path, body) {
  if (!apiToken) {
    fail(
      "Missing API token. Set CF_API_TOKEN or CLOUDFLARE_API_TOKEN. Wrangler login cannot expose a reusable API token.",
    );
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    console.error(JSON.stringify(result.errors ?? result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result.result, null, 2));
}

const accountId = getAccountId();
const basePath = `/accounts/${accountId}/pages/projects/${projectName}/domains`;

if (action === "list") {
  await request("GET", basePath);
} else if (action === "create") {
  if (!domain) {
    fail("Missing domain. Set DOMAIN=... or CUSTOM_DOMAIN=...");
  }
  await request("POST", basePath, { name: domain });
} else if (action === "retry") {
  if (!domain) {
    fail("Missing domain. Set DOMAIN=... or CUSTOM_DOMAIN=...");
  }
  await request("PATCH", `${basePath}/${domain}`, {});
} else {
  fail(`Unknown action "${action}". Use create, retry, or list.`);
}
