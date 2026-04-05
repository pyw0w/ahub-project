const parsePort = (value) => {
  const parsed = Number(value ?? "3001");

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid WEB_PORT value: ${value ?? "<undefined>"}`);
  }

  return parsed;
};

export const loadWebConfig = (env = process.env) => {
  const apiBaseUrl = env.API_BASE_URL ?? "http://localhost:3000";

  return {
    appName: env.WEB_APP_NAME ?? "AHub",
    env: env.NODE_ENV ?? "development",
    port: parsePort(env.WEB_PORT),
    telegramBotName: env.TELEGRAM_BOT_NAME ?? "ahub_bot",
    apiBaseUrl,
    telemetryUrl: env.WEB_TELEMETRY_URL ?? `${apiBaseUrl}/client-telemetry`,
    authMode: env.WEB_AUTH_MODE ?? "telegram-init-data",
    endpoints: {
      auth: `${apiBaseUrl}/v1/auth/session`,
      profile: `${apiBaseUrl}/v1/profile/me`,
      season: `${apiBaseUrl}/v1/seasons/active`,
      payments: `${apiBaseUrl}/v1/payments/checkout`
    }
  };
};
