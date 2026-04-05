import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from "node:http";

import type { HealthPayload } from "@ahub/shared";

import {
  AuthBootstrapRequestError,
  createAuthBootstrapService,
  type AuthBootstrapService
} from "./auth/bootstrap.js";
import { GmlLauncherError } from "./auth/gml-client.js";
import { createMockGmlLauncherClient } from "./auth/mock-gml-client.js";
import { TelegramInitDataError } from "./auth/telegram.js";
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

const readJsonBody = async (request: IncomingMessage): Promise<unknown> =>
  await new Promise((resolve, reject) => {
    let body = "";
    let oversized = false;
    let settled = false;

    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      if (settled || oversized) {
        return;
      }

      body += chunk;

      if (body.length > 32_768) {
        oversized = true;
      }
    });
    request.on("end", () => {
      if (settled) {
        return;
      }

      if (oversized) {
        settled = true;
        reject(new AuthBootstrapRequestError("invalid_request", "Request body is too large"));
        return;
      }

      if (body.length === 0) {
        settled = true;
        reject(new AuthBootstrapRequestError("invalid_request", "Request body is required"));
        return;
      }

      try {
        settled = true;
        resolve(JSON.parse(body) as unknown);
      } catch {
        settled = true;
        reject(new AuthBootstrapRequestError("invalid_json", "Request body must be valid JSON"));
      }
    });
    request.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    });
  });

const writeHandledError = (response: ServerResponse, error: unknown): void => {
  if (error instanceof AuthBootstrapRequestError || error instanceof TelegramInitDataError) {
    writeJson(response, error.statusCode, {
      error: error.code,
      message: error.message
    });
    return;
  }

  if (error instanceof GmlLauncherError) {
    writeJson(response, 502, {
      error: "gml_upstream_error",
      code: error.code
    });
    return;
  }

  writeJson(response, 500, {
    error: "internal_error"
  });
};

type AppDependencies = {
  authBootstrapService: AuthBootstrapService;
};

const buildDependencies = (config: ApiConfig): AppDependencies => ({
  authBootstrapService: createAuthBootstrapService(config, createMockGmlLauncherClient({
    mode: config.gmlMockMode
  }))
});

const routeRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  config: ApiConfig,
  dependencies: AppDependencies
): Promise<void> => {
  if (request.url === "/healthz" || request.url === "/readyz") {
    writeJson(response, 200, buildHealthPayload(config));
    return;
  }

  if (request.method === "POST" && request.url === "/api/auth/bootstrap") {
    try {
      const requestBody = await readJsonBody(request);
      const result = await dependencies.authBootstrapService.bootstrap(requestBody);

      writeJson(response, result.httpStatus, result.payload);
    } catch (error) {
      writeHandledError(response, error);
    }

    return;
  }

  writeJson(response, 404, {
    error: "not_found"
  });
};

export const createApp = (
  config: ApiConfig,
  dependencies: AppDependencies = buildDependencies(config)
) =>
  createServer((request, response) => {
    void routeRequest(request, response, config, dependencies);
  });
