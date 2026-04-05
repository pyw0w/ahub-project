import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { HealthPayload } from "@ahub/shared";

import type { ApiConfig } from "./config.js";

export const buildHealthPayload = (config: ApiConfig): HealthPayload => ({
  service: config.appName,
  status: "ok",
  environment: config.env,
  timestamp: new Date().toISOString()
});

const writeJson = (response: ServerResponse, statusCode: number, body: unknown): void => {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};

const routeRequest = (
  request: IncomingMessage,
  response: ServerResponse,
  config: ApiConfig
): void => {
  if (request.url === "/healthz" || request.url === "/readyz") {
    writeJson(response, 200, buildHealthPayload(config));
    return;
  }

  writeJson(response, 404, {
    error: "not_found"
  });
};

export const createApp = (config: ApiConfig) =>
  createServer((request, response) => {
    routeRequest(request, response, config);
  });
