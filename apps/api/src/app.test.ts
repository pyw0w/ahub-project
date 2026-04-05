import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createAuthBootstrapService } from "./auth/bootstrap.js";
import { GmlLauncherError, type GmlLauncherClient } from "./auth/gml-client.js";
import { createMockGmlLauncherClient } from "./auth/mock-gml-client.js";
import { buildHealthPayload, createApp } from "./app.js";
import { loadConfig, type ApiConfig } from "./config.js";

void test("buildHealthPayload returns a stable service contract", () => {
  const payload = buildHealthPayload({
    appName: "AHub API",
    env: "test",
    port: 3000,
    telegramBotToken: "test-token",
    telegramInitDataTtlSec: 300,
    gmlTimeoutMs: 250,
    gmlRetryAttempts: 2,
    gmlMockMode: "success"
  });

  assert.equal(payload.service, "AHub API");
  assert.equal(payload.environment, "test");
  assert.equal(payload.status, "ok");
  assert.match(payload.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

void test("loadConfig requires TELEGRAM_BOT_TOKEN", () => {
  assert.throws(
    () =>
      loadConfig({
        PORT: "3000",
        APP_NAME: "AHub API",
        NODE_ENV: "test"
      }),
    /Missing required TELEGRAM_BOT_TOKEN/
  );
});

void test("loadConfig reads defaults from .env.local when env arg is omitted", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "ahub-api-config-"));
  const originalCwd = process.cwd();
  const originalEnv = {
    APP_NAME: process.env.APP_NAME,
    PORT: process.env.PORT,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN
  };

  writeFileSync(
    join(tempDir, ".env.local"),
    "APP_NAME=AHub Local API\nPORT=4010\nTELEGRAM_BOT_TOKEN=file-token\n"
  );

  delete process.env.APP_NAME;
  delete process.env.PORT;
  delete process.env.TELEGRAM_BOT_TOKEN;
  process.chdir(tempDir);

  try {
    const config = loadConfig();

    assert.equal(config.appName, "AHub Local API");
    assert.equal(config.port, 4010);
    assert.equal(config.telegramBotToken, "file-token");
  } finally {
    process.chdir(originalCwd);

    for (const [key, value] of Object.entries(originalEnv)) {
      if (typeof value === "string") {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }

    rmSync(tempDir, { recursive: true, force: true });
  }
});

const testConfig: ApiConfig = {
  appName: "AHub API",
  env: "test",
  port: 0,
  telegramBotToken: "telegram-test-token",
  telegramInitDataTtlSec: 300,
  gmlTimeoutMs: 50,
  gmlRetryAttempts: 2,
  gmlMockMode: "success"
};

const buildTelegramInitData = (overrides: {
  authDate?: number;
  botToken?: string;
  userId?: number;
} = {}): string => {
  const authDate = overrides.authDate ?? 1_775_360_000;
  const botToken = overrides.botToken ?? testConfig.telegramBotToken;
  const userId = overrides.userId ?? 42;
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify({
      id: userId,
      first_name: "Miner",
      username: "miner01",
      language_code: "ru"
    })
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  params.set("hash", hash);

  return params.toString();
};

const startTestServer = async (client: GmlLauncherClient) => {
  const app = createApp(testConfig, {
    authBootstrapService: createAuthBootstrapService(testConfig, client)
  });

  app.listen(0);
  await once(app, "listening");

  const address = app.address() as AddressInfo;

  return {
    close: async () => {
      app.close();
      await once(app, "close");
    },
    url: `http://127.0.0.1:${address.port}`
  };
};

void test("POST /api/auth/bootstrap returns a launcher session for valid Telegram init data", async () => {
  const server = await startTestServer(createMockGmlLauncherClient());

  try {
    const response = await fetch(`${server.url}/api/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        initData: buildTelegramInitData({
          authDate: Math.floor(Date.now() / 1000)
        })
      })
    });

    assert.equal(response.status, 200);

    const payload = (await response.json()) as {
      status: string;
      gml: { status: string; accountId: string };
      user: { id: string };
    };

    assert.equal(payload.status, "ok");
    assert.equal(payload.user.id, "42");
    assert.equal(payload.gml.status, "ready");
    assert.equal(payload.gml.accountId, "gml:42");
  } finally {
    await server.close();
  }
});

void test("POST /api/auth/bootstrap rejects an invalid Telegram signature", async () => {
  const server = await startTestServer(createMockGmlLauncherClient());

  try {
    const tamperedInitData = `${buildTelegramInitData({
      authDate: Math.floor(Date.now() / 1000)
    })}&foo=bar`;
    const response = await fetch(`${server.url}/api/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        initData: tamperedInitData
      })
    });

    assert.equal(response.status, 401);

    const payload = (await response.json()) as { error: string };
    assert.equal(payload.error, "invalid_telegram_init_data");
  } finally {
    await server.close();
  }
});

void test("POST /api/auth/bootstrap degrades cleanly when GML is temporarily unavailable", async () => {
  const server = await startTestServer(
    createMockGmlLauncherClient({
      mode: "temporarily_unavailable"
    })
  );

  try {
    const response = await fetch(`${server.url}/api/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        initData: buildTelegramInitData({
          authDate: Math.floor(Date.now() / 1000)
        })
      })
    });

    assert.equal(response.status, 202);

    const payload = (await response.json()) as {
      status: string;
      gml: { status: string; retryAfterSeconds: number };
    };

    assert.equal(payload.status, "degraded");
    assert.equal(payload.gml.status, "temporarily_unavailable");
    assert.equal(payload.gml.retryAfterSeconds, 30);
  } finally {
    await server.close();
  }
});

void test("POST /api/auth/bootstrap retries a transient timeout once before succeeding", async () => {
  let attempts = 0;
  const client: GmlLauncherClient = {
    bootstrapSession(input) {
      attempts += 1;

      if (attempts === 1) {
        return Promise.reject(new GmlLauncherError("timeout", "transient timeout", true));
      }

      return Promise.resolve({
        accountId: `gml:${input.telegramUser.id}`,
        sessionToken: "retry-success-token",
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      });
    }
  };
  const server = await startTestServer(client);

  try {
    const response = await fetch(`${server.url}/api/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        initData: buildTelegramInitData({
          authDate: Math.floor(Date.now() / 1000)
        })
      })
    });

    assert.equal(response.status, 200);
    assert.equal(attempts, 2);
  } finally {
    await server.close();
  }
});

void test("POST /api/auth/bootstrap returns structured 400 for oversized request bodies", async () => {
  const server = await startTestServer(createMockGmlLauncherClient());
  const oversizedBody = "x".repeat(40_000);

  try {
    const response = await fetch(`${server.url}/api/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        initData: oversizedBody
      })
    });

    assert.equal(response.status, 400);

    const payload = (await response.json()) as { error: string; message: string };
    assert.equal(payload.error, "invalid_request");
    assert.equal(payload.message, "Request body is too large");
  } finally {
    await server.close();
  }
});
