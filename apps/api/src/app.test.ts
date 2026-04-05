import assert from "node:assert/strict";
import test from "node:test";

import { buildHealthPayload } from "./app.js";

void test("buildHealthPayload returns a stable service contract", () => {
  const payload = buildHealthPayload({
    appName: "AHub API",
    env: "test",
    port: 3000
  });

  assert.equal(payload.service, "AHub API");
  assert.equal(payload.environment, "test");
  assert.equal(payload.status, "ok");
  assert.match(payload.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
