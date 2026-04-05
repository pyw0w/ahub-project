import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const parsePort = (value) => {
  const parsed = Number(value ?? "3001");

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid WEB_PORT value: ${value ?? "<undefined>"}`);
  }

  return parsed;
};

const stripWrappingQuotes = (value) => {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const loadEnvFromLocalFile = (env) => {
  const envFilePath = resolve(process.cwd(), ".env.local");

  if (!existsSync(envFilePath)) {
    return env;
  }

  const fileEnv = readFileSync(envFilePath, "utf8")
    .split(/\r?\n/u)
    .reduce((accumulator, line) => {
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
    ...fileEnv,
    ...env
  };
};

export const loadWebConfig = (env = process.env) => {
  const resolvedEnv = env === process.env ? loadEnvFromLocalFile(env) : env;
  const apiBaseUrl = resolvedEnv.API_BASE_URL ?? "http://localhost:3000";

  return {
    appName: resolvedEnv.WEB_APP_NAME ?? "AHub",
    env: resolvedEnv.NODE_ENV ?? "development",
    port: parsePort(resolvedEnv.WEB_PORT),
    telegramBotName: resolvedEnv.TELEGRAM_BOT_NAME ?? "ahub_bot",
    apiBaseUrl,
    telemetryUrl: resolvedEnv.WEB_TELEMETRY_URL ?? `${apiBaseUrl}/client-telemetry`,
    authMode: resolvedEnv.WEB_AUTH_MODE ?? "telegram-init-data",
    endpoints: {
      auth: `${apiBaseUrl}/v1/auth/session`,
      profile: `${apiBaseUrl}/v1/profile/me`,
      season: `${apiBaseUrl}/v1/seasons/active`,
      payments: `${apiBaseUrl}/v1/payments/checkout`
    }
  };
};
