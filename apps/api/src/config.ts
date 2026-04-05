import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const parseRequiredString = (value: string | undefined, variableName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required ${variableName}`);
  }

  return value;
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

const stripWrappingQuotes = (value: string): string => {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const loadEnvFromLocalFile = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const envFilePath = resolve(process.cwd(), ".env.local");

  if (!existsSync(envFilePath)) {
    return env;
  }

  const fileEntries = readFileSync(envFilePath, "utf8")
    .split(/\r?\n/u)
    .reduce<NodeJS.ProcessEnv>((accumulator, line) => {
      const trimmedLine = line.trim();

      if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
        return accumulator;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = stripWrappingQuotes(trimmedLine.slice(separatorIndex + 1).trim());

      if (key.length > 0) {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});

  return {
    ...fileEntries,
    ...env
  };
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

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ApiConfig => {
  const resolvedEnv = env === process.env ? loadEnvFromLocalFile(env) : env;

  return {
  appName: resolvedEnv.APP_NAME ?? "AHub API",
  env: resolvedEnv.NODE_ENV ?? "development",
  port: parsePort(resolvedEnv.PORT),
  telegramBotToken: parseRequiredString(
    resolvedEnv.TELEGRAM_BOT_TOKEN,
    "TELEGRAM_BOT_TOKEN"
  ),
  telegramInitDataTtlSec: parsePositiveInteger(
    resolvedEnv.TELEGRAM_INIT_DATA_TTL_SEC,
    300,
    "TELEGRAM_INIT_DATA_TTL_SEC"
  ),
  gmlTimeoutMs: parsePositiveInteger(
    resolvedEnv.GML_TIMEOUT_MS,
    250,
    "GML_TIMEOUT_MS"
  ),
  gmlRetryAttempts: parsePositiveInteger(
    resolvedEnv.GML_RETRY_ATTEMPTS,
    2,
    "GML_RETRY_ATTEMPTS"
  ),
  gmlMockMode: parseMockMode(resolvedEnv.GML_MOCK_MODE)
  };
};
