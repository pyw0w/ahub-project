import type { MockGmlMode } from "./auth/mock-gml-client.js";

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value ?? "3000");

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${value ?? "<undefined>"}`);
  }

  return parsed;
};

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  variableName: string
): number => {
  const parsed = Number(value ?? String(fallback));

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${variableName} value: ${value ?? "<undefined>"}`);
  }

  return parsed;
};

const parseMockMode = (value: string | undefined): MockGmlMode => {
  const mode = value ?? "success";

  if (
    mode !== "success" &&
    mode !== "temporarily_unavailable" &&
    mode !== "timeout_once"
  ) {
    throw new Error(`Invalid GML_MOCK_MODE value: ${mode}`);
  }

  return mode;
};

export type ApiConfig = {
  appName: string;
  env: string;
  port: number;
  telegramBotToken: string;
  telegramInitDataTtlSec: number;
  gmlTimeoutMs: number;
  gmlRetryAttempts: number;
  gmlMockMode: MockGmlMode;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ApiConfig => ({
  appName: env.APP_NAME ?? "AHub API",
  env: env.NODE_ENV ?? "development",
  port: parsePort(env.PORT),
  telegramBotToken: env.TELEGRAM_BOT_TOKEN ?? "dev-telegram-token",
  telegramInitDataTtlSec: parsePositiveInteger(
    env.TELEGRAM_INIT_DATA_TTL_SEC,
    300,
    "TELEGRAM_INIT_DATA_TTL_SEC"
  ),
  gmlTimeoutMs: parsePositiveInteger(env.GML_TIMEOUT_MS, 250, "GML_TIMEOUT_MS"),
  gmlRetryAttempts: parsePositiveInteger(
    env.GML_RETRY_ATTEMPTS,
    2,
    "GML_RETRY_ATTEMPTS"
  ),
  gmlMockMode: parseMockMode(env.GML_MOCK_MODE)
});
