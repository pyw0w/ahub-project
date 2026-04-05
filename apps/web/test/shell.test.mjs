import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadWebConfig } from "../src/config.mjs";
import { renderAppShell } from "../src/shell.mjs";

test("loadWebConfig builds stable API hand-off points", () => {
  const config = loadWebConfig({
    WEB_PORT: "4321",
    WEB_APP_NAME: "AHub Staging",
    API_BASE_URL: "https://api.example.test",
    TELEGRAM_BOT_NAME: "ahub_staging_bot",
    WEB_TELEMETRY_URL: "https://api.example.test/telemetry"
  });

  assert.equal(config.port, 4321);
  assert.equal(config.appName, "AHub Staging");
  assert.equal(config.endpoints.auth, "https://api.example.test/v1/auth/session");
  assert.equal(config.endpoints.profile, "https://api.example.test/v1/profile/me");
  assert.equal(config.telemetryUrl, "https://api.example.test/telemetry");
});

test("loadWebConfig reads defaults from .env.local when env arg is omitted", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "ahub-web-config-"));
  const originalCwd = process.cwd();
  const originalEnv = {
    WEB_PORT: process.env.WEB_PORT,
    WEB_APP_NAME: process.env.WEB_APP_NAME,
    API_BASE_URL: process.env.API_BASE_URL,
    TELEGRAM_BOT_NAME: process.env.TELEGRAM_BOT_NAME
  };

  writeFileSync(
    join(tempDir, ".env.local"),
    "WEB_PORT=4123\nWEB_APP_NAME=AHub Local Web\nAPI_BASE_URL=https://api.local.test\nTELEGRAM_BOT_NAME=ahub_local_bot\n"
  );

  delete process.env.WEB_PORT;
  delete process.env.WEB_APP_NAME;
  delete process.env.API_BASE_URL;
  delete process.env.TELEGRAM_BOT_NAME;
  process.chdir(tempDir);

  try {
    const config = loadWebConfig();

    assert.equal(config.port, 4123);
    assert.equal(config.appName, "AHub Local Web");
    assert.equal(config.apiBaseUrl, "https://api.local.test");
    assert.equal(config.telegramBotName, "ahub_local_bot");
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

test("renderAppShell embeds bootstrap, navigation and telemetry wiring", () => {
  const html = renderAppShell(
    loadWebConfig({
      WEB_APP_NAME: "AHub",
      API_BASE_URL: "https://api.ahub.test",
      TELEGRAM_BOT_NAME: "ahub_bot"
    })
  );

  assert.match(html, /Telegram Mini App shell/);
  assert.match(html, /data-panel-target="profile"/);
  assert.match(html, /data-panel-target="season"/);
  assert.match(html, /data-panel-target="payments"/);
  assert.match(html, /miniapp_preview_loaded/);
  assert.match(html, /client_error/);
  assert.match(html, /https:\/\/api\.ahub\.test\/v1\/payments\/checkout/);
  assert.match(html, /"telegramBotName":"ahub_bot"/);
});
