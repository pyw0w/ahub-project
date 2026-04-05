import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const port = "3101";
const server = spawn(resolve("node_modules/.bin/tsx"), ["apps/api/src/server.ts"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: port,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? "smoke-telegram-token"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

const waitForReady = async () => {
  let ready = false;

  server.stdout.setEncoding("utf8");
  server.stderr.setEncoding("utf8");

  server.stdout.on("data", (chunk) => {
    if (chunk.includes("listening on")) {
      ready = true;
    }
    process.stdout.write(chunk);
  });

  server.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (ready) {
      return;
    }
    if (server.exitCode !== null) {
      throw new Error(`API process exited early with code ${server.exitCode}`);
    }
    await delay(250);
  }

  throw new Error("API process did not become ready in time");
};

const assertHealthy = async () => {
  const response = await fetch(`http://127.0.0.1:${port}/healthz`);
  if (!response.ok) {
    throw new Error(`Health endpoint returned ${response.status}`);
  }

  const payload = await response.json();
  if (payload.status !== "ok") {
    throw new Error(`Unexpected health payload: ${JSON.stringify(payload)}`);
  }
};

try {
  await waitForReady();
  await assertHealthy();
} finally {
  server.kill("SIGTERM");
  await once(server, "exit");
}
