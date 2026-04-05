import type {
  AuthBootstrapDegradedPayload,
  AuthBootstrapPayload,
  AuthBootstrapReadyPayload
} from "@ahub/shared";

import {
  GmlLauncherError,
  isRetryableGmlError,
  type GmlLauncherClient
} from "./gml-client.js";
import { validateTelegramInitData } from "./telegram.js";

export class AuthBootstrapRequestError extends Error {
  readonly code: "invalid_json" | "invalid_request";
  readonly statusCode: 400;

  constructor(code: "invalid_json" | "invalid_request", message: string) {
    super(message);
    this.name = "AuthBootstrapRequestError";
    this.code = code;
    this.statusCode = 400;
  }
}

export type AuthBootstrapServiceConfig = {
  telegramBotToken: string;
  telegramInitDataTtlSec: number;
  gmlTimeoutMs: number;
  gmlRetryAttempts: number;
};

export type AuthBootstrapResult =
  | { httpStatus: 200; payload: AuthBootstrapReadyPayload }
  | { httpStatus: 202; payload: AuthBootstrapDegradedPayload };

export type AuthBootstrapService = {
  bootstrap(requestBody: unknown): Promise<AuthBootstrapResult>;
};

const asObject = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AuthBootstrapRequestError(
      "invalid_request",
      "Auth bootstrap body must be a JSON object"
    );
  }

  return value as Record<string, unknown>;
};

const readInitData = (requestBody: unknown): string => {
  const payload = asObject(requestBody);
  const initData = payload.initData;

  if (typeof initData !== "string" || initData.length === 0) {
    throw new AuthBootstrapRequestError(
      "invalid_request",
      "Auth bootstrap body must include a non-empty initData string"
    );
  }

  return initData;
};

const withTimeout = async <Value>(
  operation: () => Promise<Value>,
  timeoutMs: number
): Promise<Value> =>
  await new Promise<Value>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new GmlLauncherError("timeout", "GML launcher request timed out", true));
    }, timeoutMs);

    void operation()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("Unknown GML launcher failure"));
      });
  });

const invokeWithRetry = async <Value>(
  operation: () => Promise<Value>,
  retryAttempts: number
): Promise<Value> => {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      if (!isRetryableGmlError(error) || attempt >= retryAttempts) {
        throw error;
      }
    }
  }
};

export const createAuthBootstrapService = (
  config: AuthBootstrapServiceConfig,
  gmlLauncherClient: GmlLauncherClient
): AuthBootstrapService => ({
  async bootstrap(requestBody) {
    const initData = readInitData(requestBody);
    const telegramData = validateTelegramInitData({
      initData,
      botToken: config.telegramBotToken,
      ttlSeconds: config.telegramInitDataTtlSec
    });

    try {
      const session = await invokeWithRetry(
        async () =>
          await withTimeout(
            async () =>
              await gmlLauncherClient.bootstrapSession({
                telegramUser: telegramData.user,
                authDate: telegramData.authDate
              }),
            config.gmlTimeoutMs
          ),
        config.gmlRetryAttempts
      );

      const payload: AuthBootstrapPayload = {
        status: "ok",
        user: telegramData.user,
        gml: {
          status: "ready",
          provider: "mock",
          accountId: session.accountId,
          sessionToken: session.sessionToken,
          expiresAt: session.expiresAt
        }
      };

      return {
        httpStatus: 200,
        payload
      };
    } catch (error) {
      if (
        error instanceof GmlLauncherError &&
        error.code === "temporarily_unavailable"
      ) {
        return {
          httpStatus: 202,
          payload: {
            status: "degraded",
            user: telegramData.user,
            gml: {
              status: "temporarily_unavailable",
              provider: "mock",
              retryable: true,
              retryAfterSeconds: 30
            }
          }
        };
      }

      throw error;
    }
  }
});
