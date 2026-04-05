import {
  GmlLauncherError,
  type BootstrapLauncherSessionInput,
  type BootstrapLauncherSessionResult,
  type GmlLauncherClient
} from "./gml-client.js";

export type MockGmlMode = "success" | "temporarily_unavailable" | "timeout_once";

export type MockGmlLauncherClientOptions = {
  mode?: MockGmlMode;
  now?: () => Date;
};

export const createMockGmlLauncherClient = (
  options: MockGmlLauncherClientOptions = {}
): GmlLauncherClient => {
  const { mode = "success", now = () => new Date() } = options;
  let attempt = 0;

  const buildSuccessResult = (
    input: BootstrapLauncherSessionInput
  ): BootstrapLauncherSessionResult => {
    const expiresAt = new Date(now().getTime() + 15 * 60 * 1000).toISOString();

    return {
      accountId: `gml:${input.telegramUser.id}`,
      sessionToken: `mock-session-${input.telegramUser.id}`,
      expiresAt
    };
  };

  return {
    bootstrapSession(input) {
      attempt += 1;

      if (mode === "temporarily_unavailable") {
        return Promise.reject(
          new GmlLauncherError(
            "temporarily_unavailable",
            "GML launcher is temporarily unavailable",
            true
          )
        );
      }

      if (mode === "timeout_once" && attempt === 1) {
        return Promise.reject(
          new GmlLauncherError("timeout", "GML launcher request timed out", true)
        );
      }

      return Promise.resolve(buildSuccessResult(input));
    }
  };
};
