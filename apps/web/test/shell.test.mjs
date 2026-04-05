import assert from "node:assert/strict";
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
