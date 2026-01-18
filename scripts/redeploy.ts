#!/usr/bin/env tsx

// Allow self-signed certificates for local HTTPS servers
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * Redeploy script for Portainer CE
 *
 * Required environment variables:
 * - PORTAINER_URL: Your Portainer instance URL (e.g., https://192.168.1.100:9443)
 * - PORTAINER_API_KEY: API key from Portainer (User settings > Access tokens)
 * - PORTAINER_STACK_ID: The stack ID to redeploy
 * - PORTAINER_ENDPOINT_ID: The endpoint/environment ID (usually 1 for local)
 */

const PORTAINER_URL = process.env.PORTAINER_URL;
const PORTAINER_API_KEY = process.env.PORTAINER_API_KEY;
const STACK_ID = process.env.PORTAINER_STACK_ID;
const ENDPOINT_ID = process.env.PORTAINER_ENDPOINT_ID || "1";

const isListCommand =
  process.argv.includes("--list-endpoints") ||
  process.argv.includes("--list-stacks");

if (!PORTAINER_URL || !PORTAINER_API_KEY) {
  console.error("Missing required environment variables:");
  console.error("  PORTAINER_URL - Your Portainer instance URL");
  console.error("  PORTAINER_API_KEY - API key from Portainer");
  process.exit(1);
}

if (!isListCommand && !STACK_ID) {
  console.error("PORTAINER_STACK_ID not set. Run with --list-stacks to see available stacks.\n");
  // Fall through to show available stacks and endpoints
}

async function listEndpoints() {
  const response = await fetch(`${PORTAINER_URL}/api/endpoints`, {
    headers: { "X-API-Key": PORTAINER_API_KEY! },
  });
  if (!response.ok) throw new Error("Failed to fetch endpoints");
  const endpoints = await response.json();
  console.log("Available endpoints:");
  for (const ep of endpoints) {
    console.log(`  ID: ${ep.Id} - ${ep.Name}`);
  }
  return endpoints;
}

async function listStacks() {
  const response = await fetch(`${PORTAINER_URL}/api/stacks`, {
    headers: { "X-API-Key": PORTAINER_API_KEY! },
  });
  if (!response.ok) throw new Error("Failed to fetch stacks");
  const stacks = await response.json();
  console.log("Available stacks:");
  for (const stack of stacks) {
    console.log(`  ID: ${stack.Id} - ${stack.Name} (endpoint: ${stack.EndpointId})`);
  }
  return stacks;
}

async function redeploy() {
  console.log(`Fetching stack ${STACK_ID} from Portainer...`);

  // First, get the current stack to retrieve its config
  const stackResponse = await fetch(
    `${PORTAINER_URL}/api/stacks/${STACK_ID}`,
    {
      headers: {
        "X-API-Key": PORTAINER_API_KEY!,
      },
    }
  );

  if (!stackResponse.ok) {
    const error = await stackResponse.text();
    throw new Error(`Failed to fetch stack: ${error}`);
  }

  const stack = await stackResponse.json();
  console.log(`Found stack: ${stack.Name}`);
  console.log(`Stack type: ${stack.Type}, GitConfig: ${!!stack.GitConfig}`);

  if (process.argv.includes("--debug")) {
    console.log("Stack details:", JSON.stringify(stack, null, 2));
  }

  // Redeploy with pullImage=true to fetch the latest image
  console.log("Triggering redeploy with image pull...");

  let redeployResponse: Response;

  if (stack.GitConfig) {
    // Git-based stack - use the git redeploy endpoint
    console.log("Using git-based redeploy...");
    redeployResponse = await fetch(
      `${PORTAINER_URL}/api/stacks/${STACK_ID}/git/redeploy?endpointId=${ENDPOINT_ID}`,
      {
        method: "PUT",
        headers: {
          "X-API-Key": PORTAINER_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          env: stack.Env,
          prune: true,
          pullImage: true,
        }),
      }
    );
  } else {
    // File-based stack - need to fetch the stack file first
    console.log("Using file-based redeploy...");
    console.log("(This may take a while - pulling image and restarting containers...)");

    const fileResponse = await fetch(
      `${PORTAINER_URL}/api/stacks/${STACK_ID}/file`,
      {
        headers: { "X-API-Key": PORTAINER_API_KEY! },
      }
    );

    if (!fileResponse.ok) {
      const error = await fileResponse.text();
      throw new Error(`Failed to fetch stack file: ${error}`);
    }

    const fileData = await fileResponse.json();

    redeployResponse = await fetch(
      `${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}`,
      {
        method: "PUT",
        headers: {
          "X-API-Key": PORTAINER_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stackFileContent: fileData.StackFileContent,
          env: stack.Env,
          prune: true,
          pullImage: true,
        }),
      }
    );
  }

  if (!redeployResponse.ok) {
    const error = await redeployResponse.text();
    throw new Error(`Failed to redeploy: ${error}`);
  }

  console.log("✓ Redeploy triggered successfully!");
  console.log("  The new image is being pulled and containers will restart.");
}

async function main() {
  if (process.argv.includes("--list-endpoints")) {
    await listEndpoints();
    return;
  }

  if (process.argv.includes("--list-stacks")) {
    await listStacks();
    return;
  }

  // If stack ID is missing, show available options and exit
  if (!STACK_ID) {
    await listEndpoints();
    console.log("");
    await listStacks();
    console.log("\nSet PORTAINER_STACK_ID and PORTAINER_ENDPOINT_ID in .env.local");
    process.exit(1);
  }

  await redeploy();
}

main().catch((err) => {
  console.error("Redeploy failed:", err.message);
  process.exit(1);
});
