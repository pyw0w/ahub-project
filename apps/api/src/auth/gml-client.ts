export type TelegramIdentity = {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string | null;
};

export type BootstrapLauncherSessionInput = {
  telegramUser: TelegramIdentity;
  authDate: number;
};

export type BootstrapLauncherSessionResult = {
  accountId: string;
  sessionToken: string;
  expiresAt: string;
};

export type GmlLauncherErrorCode =
  | "temporarily_unavailable"
  | "timeout"
  | "invalid_response"
  | "upstream_rejected";

export class GmlLauncherError extends Error {
  readonly code: GmlLauncherErrorCode;
  readonly retryable: boolean;

  constructor(code: GmlLauncherErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "GmlLauncherError";
    this.code = code;
    this.retryable = retryable;
  }
}

export interface GmlLauncherClient {
  bootstrapSession(input: BootstrapLauncherSessionInput): Promise<BootstrapLauncherSessionResult>;
}

export const isRetryableGmlError = (error: unknown): error is GmlLauncherError =>
  error instanceof GmlLauncherError && error.retryable;
