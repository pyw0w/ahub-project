const parsePort = (value: string | undefined): number => {
  const parsed = Number(value ?? "3000");

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${value ?? "<undefined>"}`);
  }

  return parsed;
};

export type ApiConfig = {
  appName: string;
  env: string;
  port: number;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ApiConfig => ({
  appName: env.APP_NAME ?? "AHub API",
  env: env.NODE_ENV ?? "development",
  port: parsePort(env.PORT)
});
